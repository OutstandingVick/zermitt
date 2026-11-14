/**
 * Claim pipeline — every on-chain step is signed and paid by the relayer
 * (`zermitt.testnet`) or by the linkdrop claim key. The recipient signs
 * NOTHING on-chain; they only submit their chosen name and a fresh public
 * key over HTTPS, so no NEP-366 meta-transaction is even needed.
 *
 * Steps (all relayed/gasless for the recipient):
 *   1. create `name.zermitt.testnet` with the recipient's public key
 *      (relayer pays the creation deposit) — the `testnet` linkdrop contract
 *      can only create direct children of `testnet`, so sub-accounts of
 *      zermitt.testnet must be created by zermitt.testnet itself; we then
 *      use plain `claim` to route the linkdrop NEAR to that account.
 *   2. claim the linkdrop NEAR to the new account (signed with the claim key).
 *   3. storage_deposit for the new account on the USDC contract (relayer).
 *   4. ft_transfer the USDC amount from the relayer (relayer).
 */
import { KeyPair, utils } from "near-api-js";
import { loadConfig, requireRelayer, type ZermittConfig } from "../config";
import { connectNear, txLink } from "../near/client";
import { validateName } from "../near/names";
import { claimState, getTransfer, updateTransfer, type TransferRecord } from "../transfers/store";

const LINKDROP_CONTRACT = "testnet";
/** NEAR the relayer seeds the new account with (covers its state). */
const NEW_ACCOUNT_SEED = "0.05";
/** NEP-145 storage bound for usdc.fakes.testnet registration. */
const FT_STORAGE_DEPOSIT = "0.00235";

export class ClaimError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type ClaimResult = {
  transfer: TransferRecord;
  accountId: string;
  usdcAmount: string;
  txUrls: { create: string; claim: string; storage: string; payout: string };
};

export async function accountExists(config: ZermittConfig, accountId: string): Promise<boolean> {
  const res = await fetch(config.nodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: { request_type: "view_account", finality: "final", account_id: accountId },
    }),
  });
  const data = (await res.json()) as { result?: unknown; error?: unknown };
  return Boolean(data.result);
}

export async function executeClaim(
  transferId: string,
  name: string,
  recipientPublicKey: string,
  claimPrivateKey: string,
  config: ZermittConfig = loadConfig()
): Promise<ClaimResult> {
  const record = await getTransfer(transferId);
  const state = claimState(record);
  if (state.state === "invalid") throw new ClaimError(state.reason, 404);
  if (state.state === "expired") throw new ClaimError("This claim link has expired.", 410);
  if (state.state === "already-claimed")
    throw new ClaimError("This transfer was already claimed.", 409);
  const transfer = record!;

  // The provided claim key must match the one the link was funded with.
  const claimKey = KeyPair.fromString(claimPrivateKey as never);
  if (transfer.claimKeyPublic && claimKey.getPublicKey().toString() !== transfer.claimKeyPublic)
    throw new ClaimError("Claim key does not match this transfer.", 403);

  const check = validateName(name);
  if (!check.ok) throw new ClaimError(check.reason, 422);
  const accountId = check.accountId;
  if (await accountExists(config, accountId))
    throw new ClaimError(`${accountId} is already taken — pick another name.`, 409);

  const relayer = requireRelayer(config);
  const near = await connectNear(config, {
    accountId: relayer.accountId,
    privateKey: relayer.privateKey,
  });
  const relayerAccount = await near.account(relayer.accountId);

  // 1. Create the named sub-account with the recipient's key.
  const createRes = await relayerAccount.createAccount(
    accountId,
    recipientPublicKey as never,
    BigInt(utils.format.parseNearAmount(NEW_ACCOUNT_SEED)!)
  );
  const createHash = createRes.transaction.hash as string;

  // 2. Claim the linkdrop NEAR into the new account (signed with the claim key).
  const keyStore = (near.connection.signer as unknown as { keyStore: { setKey: Function } }).keyStore;
  await keyStore.setKey(config.networkId, LINKDROP_CONTRACT, claimKey);
  const linkdropSigner = await near.account(LINKDROP_CONTRACT);
  const claimRes = await linkdropSigner.functionCall({
    contractId: LINKDROP_CONTRACT,
    methodName: "claim",
    args: { account_id: accountId },
    gas: BigInt("100000000000000"),
  });
  const claimHash = claimRes.transaction.hash as string;

  // 3. Register the new account on the USDC contract (relayer pays).
  const storageRes = await relayerAccount.functionCall({
    contractId: config.testUsdcContract,
    methodName: "storage_deposit",
    args: { account_id: accountId },
    gas: BigInt("30000000000000"),
    attachedDeposit: BigInt(utils.format.parseNearAmount(FT_STORAGE_DEPOSIT)!),
  });
  const storageHash = storageRes.transaction.hash as string;

  // 4. Pay out the quoted USDC amount (6 decimals) from the relayer.
  const usdcAmount = transfer.quote.amountOut;
  const payoutRes = await relayerAccount.functionCall({
    contractId: config.testUsdcContract,
    methodName: "ft_transfer",
    args: { receiver_id: accountId, amount: usdcAmount, memo: `zermitt:${transfer.id}` },
    gas: BigInt("30000000000000"),
    attachedDeposit: BigInt(1),
  });
  const payoutHash = payoutRes.transaction.hash as string;

  let updated = await updateTransfer(transfer.id, {
    status: "claimed",
    recipientAccountId: accountId,
    transactions: {
      ...transfer.transactions,
      accountCreateTxHash: createHash,
      claimTxHash: claimHash,
      storageDepositTxHash: storageHash,
      payoutTxHash: payoutHash,
    },
  });

  // Record the public receipt on-chain (non-fatal if it fails; the claim
  // itself already succeeded — the receipt can be re-recorded later).
  let receiptTxUrl: string | undefined;
  try {
    const { recordReceipt } = await import("../receipts/record");
    const receipt = await recordReceipt(updated, config);
    receiptTxUrl = receipt.receiptTxUrl;
    updated = { ...updated, transactions: { ...updated.transactions, receiptTxHash: receipt.receiptTxHash } };
  } catch (err) {
    console.error("Receipt recording failed (claim succeeded):", err);
  }

  const n = config.networkId;
  return {
    transfer: updated,
    accountId,
    usdcAmount,
    txUrls: {
      create: txLink(n, createHash),
      claim: txLink(n, claimHash),
      storage: txLink(n, storageHash),
      payout: txLink(n, payoutHash),
      ...(receiptTxUrl ? { receipt: receiptTxUrl } : {}),
    },
  };
}
