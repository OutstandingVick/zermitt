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
import { loadConfig } from "../lib/config";
import { parseIntent } from "../lib/agent/parse";
import { getSendQuote } from "../lib/intents/quote";
import { executeSend } from "../lib/send/execute";

async function main() {
  const config = loadConfig();
  console.log(`Zermitt demo (DEMO_MODE=${config.demoMode}, network=${config.networkId})\n`);

  const text = "send $5 to mum";
  console.log(`1. parse   "${text}"`);
  const intent = await parseIntent(text, config.anthropicApiKey);
  console.log(`   → ${JSON.stringify(intent)} (${config.anthropicApiKey ? "LLM" : "fallback parser"})\n`);

  console.log("2. quote   real 1Click dry quote (mainnet pricing)");
  const quote = await getSendQuote("USDT", intent.amount, config.oneClickJwt);
  console.log(
    `   → ${quote.amountInFormatted} USDT → ${quote.amountOutFormatted} USDC on NEAR` +
      ` (fee ~$${quote.feeUsd.toFixed(4)}, ~${quote.timeEstimateSec}s)\n`
  );

  console.log("3. send    swap + fund claim link");
  const result = await executeSend(text, intent, quote, config);
  console.log(`   swap: ${result.swapNote}`);
  console.log(`   link funded on testnet: ${result.linkFundTxUrl}`);
  console.log(`   claim link: ${result.claimLink}\n`);

  console.log("4. claim   TODO (Phase 2): Google sign-in + gasless claim via meta-tx.");
  console.log("5. receipt TODO (Phase 3): on-chain receipt contract.\n");
  console.log(`Transfer recorded: data/transfers.json (id ${result.transfer.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
