/**
 * Send execution pipeline:
 *   quote (real, dry) → swap (MOCKED in DEMO_MODE, clearly labeled;
 *   real mainnet 1Click swap when LIVE_INTENTS=true) → fund a testnet
 *   claim link → record the transfer.
 *
 * The testnet linkdrop contract (`testnet`, NEP-452) holds NEAR only, so the
 * payout pattern is: the link funds the new account with NEAR, and the
 * relayer sends test USDC (usdc.fakes.testnet) to the claimed account after
 * claim (Phase 2 wires that into the claim flow).
 */
import { KeyPair, utils } from "near-api-js";
import { loadConfig, requireRelayer, type ZermittConfig } from "../config";
import { connectNear, txLink } from "../near/client";
import type { SendIntent } from "../agent/parse";
import { getSendQuote, type SendQuote } from "../intents/quote";
import { createTransfer, updateTransfer, type TransferRecord } from "../transfers/store";

const LINKDROP_CONTRACT = "testnet";
/** Must exceed the linkdrop contract's 1-NEAR ACCESS_KEY_ALLOWANCE. */
const LINK_DEPOSIT_NEAR = "1.5";

export type SendResult = {
  transfer: TransferRecord;
  claimLink: string;
  linkFundTxHash: string;
  linkFundTxUrl: string;
  swapExecution: "mocked-demo" | "live-mainnet";
  swapNote: string;
  swapTxHash?: string;
};

export async function executeSend(
  text: string,
  intent: SendIntent,
  quote: SendQuote,
  config: ZermittConfig = loadConfig(),
  agentProof?: import("../agent/nearai").AgentProof,
  senderName?: string
): Promise<SendResult> {
  const relayer = requireRelayer(config);

  const record = createTransfer({
    request: { text, intent },
    ...(senderName?.trim() ? { senderName: senderName.trim().slice(0, 40) } : {}),
    ...(agentProof ? { agentProof } : {}),
    quote,
    route: {
      swapExecution: config.liveIntents ? "live-mainnet" : "mocked-demo",
      claimNetwork: "testnet",
      payoutToken: config.testUsdcContract,
    },
    transactions: {},
    status: "quoted",
  });

  // ── Swap step ──
  let swapNote: string;
  let swapTxHash: string | undefined;
  if (config.liveIntents) {
    swapTxHash = await runLiveMainnetSwap(intent, config);
    swapNote = `LIVE mainnet swap executed via 1Click (tx ${swapTxHash}).`;
  } else {
    swapNote =
      "🧪 MOCKED (DEMO_MODE): Intents has no testnet, so the swap step is simulated. " +
      "The quote above is real mainnet pricing. Set LIVE_INTENTS=true for a real swap.";
  }

  // ── Fund the claim link on testnet ──
  const near = await connectNear(config, {
    accountId: relayer.accountId,
    privateKey: relayer.privateKey,
  });
  const funder = await near.account(relayer.accountId);
  const claimKey = KeyPair.fromRandom("ed25519");
  const result = await funder.functionCall({
    contractId: LINKDROP_CONTRACT,
    methodName: "send",
    args: { public_key: claimKey.getPublicKey().toString() },
    gas: BigInt("50000000000000"),
    attachedDeposit: BigInt(utils.format.parseNearAmount(LINK_DEPOSIT_NEAR)!),
  });
  const linkFundTxHash = result.transaction.hash as string;
  // Zermitt's own claim page. The private claim key travels in the URL
  // fragment (never sent to the server until the recipient claims).
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const claimLink = `${appUrl}/claim/${record.id}#k=${claimKey.toString()}`;

  const transfer = updateTransfer(record.id, {
    transactions: { ...record.transactions, linkFundTxHash, swapTxHash },
    claimLink,
    claimKeyPublic: claimKey.getPublicKey().toString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    status: "sent",
  });

  return {
    transfer,
    claimLink,
    linkFundTxHash,
    linkFundTxUrl: txLink(config.networkId, linkFundTxHash),
    swapExecution: config.liveIntents ? "live-mainnet" : "mocked-demo",
    swapNote,
    swapTxHash,
  };
}

/**
 * LIVE_INTENTS=true: execute a REAL small mainnet swap via 1Click —
 * non-dry quote, NEP-141 transfer to the deposit address, poll status.
 */
async function runLiveMainnetSwap(intent: SendIntent, config: ZermittConfig): Promise<string> {
  const { getQuote, getStatus } = await import("../intents/oneclick");
  const { listTokens } = await import("../intents/oneclick");
  const { findAsset } = await import("./../intents/quote");
  if (!config.mainnetAccountId || !config.mainnetPrivateKey)
    throw new Error("LIVE_INTENTS needs MAINNET_ACCOUNT_ID and MAINNET_PRIVATE_KEY.");

  const tokens = await listTokens(config.oneClickJwt);
  const origin = findAsset(tokens, "USDT");
  const dest = findAsset(tokens, "USDC");
  const amountRaw = BigInt(Math.round(Math.min(intent.amount, 2) * 10 ** origin.decimals)); // cap at 2 USDT

  const quote = (await getQuote(
    {
      dry: false,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: origin.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: dest.assetId,
      amount: amountRaw.toString(),
      refundTo: config.mainnetAccountId,
      refundType: "ORIGIN_CHAIN",
      recipient: config.mainnetAccountId,
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
    },
    config.oneClickJwt
  )) as { quote: { depositAddress: string } };

  const depositAddress = quote.quote.depositAddress;
  const near = await connectNear(
    { ...config, networkId: "mainnet", nodeUrl: "https://rpc.mainnet.near.org" },
    { accountId: config.mainnetAccountId, privateKey: config.mainnetPrivateKey }
  );
  const sender = await near.account(config.mainnetAccountId);
  const transfer = await sender.functionCall({
    contractId: origin.assetId.replace("nep141:", ""),
    methodName: "ft_transfer",
    args: { receiver_id: depositAddress, amount: amountRaw.toString() },
    gas: BigInt("30000000000000"),
    attachedDeposit: BigInt(1),
  });
  const hash = transfer.transaction.hash as string;

  // Poll until the swap settles (or time out after 2 minutes).
  for (let i = 0; i < 24; i++) {
    const status = (await getStatus(depositAddress, config.oneClickJwt)) as { status?: string };
    if (status.status === "SUCCESS") return hash;
    if (status.status === "REFUNDED" || status.status === "FAILED")
      throw new Error(`Live swap ended with status ${status.status}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.warn("Live swap still settling after 2 min; deposit tx:", hash);
  return hash;
}
