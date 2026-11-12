/**
 * End-to-end demo skeleton: parse → quote → send → claim → receipt.
 * Phase 0: prints each step as TODO and exits 0. Later phases replace
 * each TODO with the real implementation and keep this script as the
 * single command judges run to verify Zermitt.
 */
import { loadConfig } from "../lib/config";

const steps: Array<[string, string]> = [
  ["1. parse", "TODO (Phase 1): LLM turns 'send $50 to mum' into a structured SendIntent."],
  ["2. quote", "TODO (Phase 1): 1Click quote — any origin asset → USDC on NEAR (lib/intents)."],
  ["3. send", "TODO (Phase 2): execute swap, fund a claim link for the recipient."],
  ["4. claim", "TODO (Phase 2): recipient signs in with Google, claims gaslessly via meta-tx."],
  ["5. receipt", "TODO (Phase 3): record the transfer in the receipts contract; print its URL."],
];

async function main() {
  const config = loadConfig();
  console.log(`Zermitt demo (DEMO_MODE=${config.demoMode}, network=${config.networkId})\n`);
  for (const [step, note] of steps) console.log(`${step}: ${note}`);
  console.log("\nPhase 0 skeleton complete — all steps are roadmap. Exit 0.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
