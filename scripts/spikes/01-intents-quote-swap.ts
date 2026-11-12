/**
 * Spike 1 — NEAR Intents (1Click API): get a real quote for a small
 * stablecoin swap ending in USDC on NEAR.
 *
 * FINDING (2026-11-12): NEAR Intents has NO testnet. The official docs
 * (https://docs.near-intents.org) recommend small mainnet swaps for testing.
 * A dry quote (`dry: true`) is free, read-only, and needs no funds or keys,
 * so this spike fetches real mainnet pricing without executing anything.
 * Executing a swap (dry: false + depositing funds) is deferred to Phase 1
 * and requires a funded mainnet account — flagged in the README.
 */
import { loadConfig } from "../../lib/config";
import { getQuote, listTokens } from "../../lib/intents/oneclick";

async function main() {
  const config = loadConfig();
  console.log("Spike 1: 1Click quote — USDT → USDC on NEAR (dry run, mainnet pricing)\n");

  const tokens = await listTokens(config.oneClickJwt);
  const usdcNear = tokens.find((t) => t.symbol === "USDC" && t.blockchain === "near");
  const usdtNear = tokens.find((t) => t.symbol === "USDT" && t.blockchain === "near");
  if (!usdcNear || !usdtNear) {
    throw new Error("Could not find USDC/USDT on NEAR in /v0/tokens — API may have changed.");
  }
  console.log(`origin:      ${usdtNear.assetId}`);
  console.log(`destination: ${usdcNear.assetId}\n`);

  const quote = await getQuote(
    {
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100, // 1%
      originAsset: usdtNear.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: usdcNear.assetId,
      amount: String(5n * 10n ** BigInt(usdtNear.decimals)), // 5 USDT
      // The API validates these accounts exist on-chain (a nonexistent one
      // returns a 400), so dry quotes use a known mainnet account.
      refundTo: "intents.near",
      refundType: "ORIGIN_CHAIN",
      recipient: "intents.near",
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    config.oneClickJwt
  );

  console.log("Quote response:");
  console.log(JSON.stringify(quote, null, 2));
  console.log(
    "\nDry quote succeeded. No transaction hash: dry quotes don't execute, and" +
      "\nIntents has no testnet — executing needs a funded mainnet account (Phase 1)."
  );
}

main().catch((err) => {
  console.error("Spike 1 failed:", err);
  process.exit(1);
});
