/**
 * End-to-end demo: parse → quote → send → claim → receipt.
 *
 * Phase 1: parse, quote, and send (claim-link creation) are REAL.
 * The Intents swap execution is MOCKED in DEMO_MODE (Intents has no
 * testnet) and clearly labeled; the quote itself is real mainnet pricing.
 * Claim and receipt are still TODO (Phases 2–3).
 *
 * Requires RELAYER_ACCOUNT_ID / RELAYER_PRIVATE_KEY in .env (funded
 * testnet account) — documented in .env.example.
 */
import { KeyPair } from "near-api-js";
import { loadConfig, requireRelayer } from "../lib/config";
import { getSendQuote } from "../lib/intents/quote";
import { executeSend } from "../lib/send/execute";
import { executeClaim, accountExists } from "../lib/claim/execute";
import { suggestName } from "../lib/near/names";
import { connectNear } from "../lib/near/client";

async function main() {
  const config = loadConfig();
  console.log(`Zermitt demo (DEMO_MODE=${config.demoMode}, network=${config.networkId})\n`);

  // Relayer balance warning.
  const relayer = requireRelayer(config);
  const near = await connectNear(config);
  const relayerBalance =
    Number((await (await near.account(relayer.accountId)).state()).amount.toString()) / 1e24;
  if (relayerBalance < 5)
    console.warn(
      `⚠️  Relayer ${relayer.accountId} holds only ${relayerBalance.toFixed(2)} NEAR — top it up (each claim link needs 1.5).\n`
    );

  const text = "send $5 to mum";
  console.log(`1. parse   "${text}" (provider: ${config.agentProvider})`);
  const { parseIntentWithProof } = await import("../lib/agent/parse");
  const { intent, proof } = await parseIntentWithProof(text, config);
  console.log(`   → ${JSON.stringify(intent)}`);
  if (proof) {
    console.log(
      `   🔒 private agent: model ${proof.model}, attestation sha256 ${proof.attestationHash.slice(0, 16)}…` +
        `\n      signature ${proof.verified ? "✅ verified against attested key " + proof.signingKey : "❌ NOT verified"}`
    );
  } else if (config.agentProvider !== "nearai") {
    console.log("   private agent skipped (no NEARAI_API_KEY)");
  }
  console.log();

  console.log("2. quote   real 1Click dry quote (mainnet pricing)");
  const quote = await getSendQuote("USDT", intent.amount, config.oneClickJwt);
  console.log(
    `   → ${quote.amountInFormatted} USDT → ${quote.amountOutFormatted} USDC on NEAR` +
      ` (fee ~$${quote.feeUsd.toFixed(4)}, ~${quote.timeEstimateSec}s)\n`
  );

  console.log("3. send    swap + fund claim link");
  const result = await executeSend(text, intent, quote, config, proof);
  console.log(`   swap: ${result.swapNote}`);
  console.log(`   link funded on testnet: ${result.linkFundTxUrl}`);
  console.log(`   claim link: ${result.claimLink}\n`);

  console.log("4. claim   mocked Google login → named account → gasless claim + USDC payout");
  const claimKey = new URL(result.claimLink).hash.replace(/^#k=/, "");
  let name = suggestName(intent.recipient);
  if (await accountExists(config, `${name}.zermitt.testnet`)) name = `${name}-${Date.now() % 100000}`;
  const recipientKey = KeyPair.fromRandom("ed25519"); // generated client-side in the real flow
  const claim = await executeClaim(
    result.transfer.id,
    name,
    recipientKey.getPublicKey().toString(),
    claimKey,
    config
  );
  console.log(`   new account: ${claim.accountId} (recipient signed nothing on-chain)`);
  console.log(`   create account tx:  ${claim.txUrls.create}`);
  console.log(`   linkdrop claim tx:  ${claim.txUrls.claim}`);
  console.log(`   storage deposit tx: ${claim.txUrls.storage}`);
  console.log(`   USDC payout tx:     ${claim.txUrls.payout}`);

  const viewer = await near.account(config.testUsdcContract);
  const usdcRaw = (await viewer.viewFunction({
    contractId: config.testUsdcContract,
    methodName: "ft_balance_of",
    args: { account_id: claim.accountId },
  })) as string;
  console.log(`   USDC balance of ${claim.accountId}: ${Number(usdcRaw) / 1e6}\n`);

  console.log("5. receipt read back from the contract and verified");
  const { readReceipt, RECEIPTS_CONTRACT } = await import("../lib/receipts/record");
  const { canonicalJson, sha256Hex } = await import("../lib/receipts/hash");
  const onChain = await readReceipt(result.transfer.id, config.nodeUrl);
  if (!onChain) throw new Error("Receipt not found on-chain after claim.");
  const recomputed = await sha256Hex(canonicalJson(onChain.meta));
  if (recomputed !== onChain.receipt_hash) throw new Error("Receipt hash mismatch!");
  console.log(`   ✅ receipt verified on-chain (${RECEIPTS_CONTRACT})`);
  const receiptTx = claim.transfer.transactions.receiptTxHash;
  if (receiptTx) console.log(`   receipt tx: https://testnet.nearblocks.io/txns/${receiptTx}`);
  console.log(`   receipt page: /r/${result.transfer.id} · pnpm verify:receipt ${result.transfer.id}\n`);
  console.log(`Transfer recorded: data/transfers.json (id ${result.transfer.id}, status claimed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
