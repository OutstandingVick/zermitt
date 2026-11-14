/**
 * End-to-end demo: parse → quote → send → claim → receipt.
 *
 * With RELAYER_ACCOUNT_ID / RELAYER_PRIVATE_KEY (a funded testnet account
 * that owns zermitt.testnet), every step runs for real on testnet. The
 * Intents swap execution is MOCKED in DEMO_MODE (Intents has no testnet)
 * and labeled; the quote is real mainnet pricing.
 *
 * Without relayer keys (a fresh clone, no .env), it runs keyless: parse and
 * the real quote run, the on-chain send/claim steps are skipped with a
 * clear message, and a committed demo receipt is verified on-chain instead.
 *
 * Optional env: DEMO_TEXT, SENDER_NAME, CLAIM_NAME.
 */
import { KeyPair } from "near-api-js";
import { loadConfig } from "../lib/config";
import { getSendQuote } from "../lib/intents/quote";
import { PARENT_ACCOUNT, suggestName } from "../lib/near/names";
import { connectNear } from "../lib/near/client";
import { readReceipt, RECEIPTS_CONTRACT } from "../lib/receipts/record";
import { canonicalJson, sha256Hex, type ReceiptMeta } from "../lib/receipts/hash";
import { checkTeeBundle } from "../lib/receipts/tee";
import { loadTeeBundle } from "../lib/receipts/bundle-source";

/** Committed demo receipt (Victor → tunde) used in keyless mode. */
const DEMO_RECEIPT_ID = "2b9f5291-5ed5-40a8-9823-acb6e7611cbf";

async function verifyReceipt(id: string, nodeUrl: string): Promise<void> {
  const onChain = await readReceipt(id, nodeUrl);
  if (!onChain) throw new Error(`Receipt ${id} not found on-chain.`);
  const recomputed = await sha256Hex(canonicalJson(onChain.meta));
  if (recomputed !== onChain.receipt_hash) throw new Error("Receipt hash mismatch!");
  console.log(`   ✅ receipt verified on-chain (${RECEIPTS_CONTRACT}): $${(Number(onChain.meta.amount_usdc) / 1e6).toFixed(2)} → ${onChain.meta.recipient_account}`);
  const meta = onChain.meta as ReceiptMeta;
  if (meta.agent_provider === "nearai") {
    const found = await loadTeeBundle(id);
    if (found) {
      const c = await checkTeeBundle(found.bundle, meta);
      console.log(`   ${c.ok ? "✅" : "❌"} TEE proof (${meta.model}): signature, nonce, report hash and key all match the chain`);
    }
  }
}

async function main() {
  const config = loadConfig();
  const keyless = !config.relayerAccountId || !config.relayerPrivateKey;
  console.log(
    `Zermitt demo (DEMO_MODE=${config.demoMode}, network=${config.networkId}` +
      `${keyless ? ", keyless: no RELAYER_* set" : ""})\n`
  );

  const near = await connectNear(config);
  if (!keyless) {
    const balance = Number((await (await near.account(config.relayerAccountId!)).state()).amount.toString()) / 1e24;
    if (balance < 5)
      console.warn(`⚠️  Relayer ${config.relayerAccountId} holds only ${balance.toFixed(2)} NEAR — top it up (each claim link needs 1.5).\n`);
  }

  const text = process.env.DEMO_TEXT ?? "send $5 to mum";
  const senderName = process.env.SENDER_NAME ?? "Victor";
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
  const origin = intent.asset === "NEAR" ? "NEAR" : "USDT";
  const quote = await getSendQuote(origin, intent.amount, config.oneClickJwt);
  console.log(
    `   → ${quote.amountInFormatted} ${origin} → ${quote.amountOutFormatted} USDC on NEAR` +
      ` (fee ~$${quote.feeUsd.toFixed(4)}, ~${quote.timeEstimateSec}s)\n`
  );

  if (keyless) {
    console.log("3. send    skipped: funding a claim link needs RELAYER_ACCOUNT_ID/RELAYER_PRIVATE_KEY (see .env.example)");
    console.log("4. claim   skipped: same reason\n");
    console.log(`5. receipt verifying a committed demo receipt instead (${DEMO_RECEIPT_ID})`);
    await verifyReceipt(DEMO_RECEIPT_ID, config.nodeUrl);
    console.log(`\nKeyless run complete. Add RELAYER_* to .env to run send and claim on testnet.`);
    return;
  }

  const { executeSend } = await import("../lib/send/execute");
  const { executeClaim, accountExists } = await import("../lib/claim/execute");

  console.log("3. send    swap + fund claim link");
  const result = await executeSend(text, intent, quote, config, proof, senderName);
  console.log(`   swap: ${result.swapNote}`);
  console.log(`   link funded on testnet: ${result.linkFundTxUrl}`);
  console.log(`   claim link: ${result.claimLink}\n`);

  console.log("4. claim   simulated Google login → named account → gasless claim + USDC payout");
  const claimKey = new URL(result.claimLink).hash.replace(/^#k=/, "");
  let name = process.env.CLAIM_NAME ?? suggestName(intent.recipient);
  if (await accountExists(config, `${name}.${PARENT_ACCOUNT}`)) name = `${name}-${Date.now() % 100000}`;
  const recipientKey = KeyPair.fromRandom("ed25519"); // generated in the browser in the real flow
  const claim = await executeClaim(result.transfer.id, name, recipientKey.getPublicKey().toString(), claimKey, config);
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
  await verifyReceipt(result.transfer.id, config.nodeUrl);
  const receiptTx = claim.transfer.transactions.receiptTxHash;
  if (receiptTx) console.log(`   receipt tx: https://testnet.nearblocks.io/txns/${receiptTx}`);
  console.log(`   receipt page: /r/${result.transfer.id} · pnpm verify:receipt ${result.transfer.id}\n`);
  console.log(`Transfer recorded: data/transfers.json (id ${result.transfer.id}, status claimed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
