/**
 * `pnpm verify:receipt <transfer_id>` — verify a Zermitt receipt with NO
 * keys and NO .env: reads the receipt from the receipts contract via a
 * public RPC view call, recomputes the sha256 over the canonical JSON of
 * the on-chain metadata, and compares it with the on-chain hash.
 */
import { canonicalJson, sha256Hex } from "../lib/receipts/hash";

const CONTRACT = process.env.RECEIPTS_CONTRACT ?? "receipts.zermitt.testnet";
const RPC = process.env.NEAR_NODE_URL ?? "https://rpc.testnet.near.org";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: pnpm verify:receipt <transfer_id>");
    process.exit(2);
  }
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: CONTRACT,
        method_name: "get_receipt",
        args_base64: Buffer.from(JSON.stringify({ transfer_id: id })).toString("base64"),
      },
    }),
  });
  const data = (await res.json()) as { result?: { result: number[] } };
  if (!data.result) throw new Error("RPC query failed");
  const receipt = JSON.parse(Buffer.from(data.result.result).toString());
  if (!receipt) {
    console.log(`No receipt on-chain for transfer ${id} (unclaimed, or unknown id).`);
    process.exit(1);
  }

  console.log(`Receipt for ${id} on ${CONTRACT}:`);
  console.log(JSON.stringify(receipt.meta, null, 2));
  const recomputed = await sha256Hex(canonicalJson(receipt.meta));
  console.log(`\non-chain hash:  ${receipt.receipt_hash}`);
  console.log(`recomputed:     ${recomputed}`);
  if (recomputed === receipt.receipt_hash) {
    console.log("✅ Verified — the on-chain data matches its hash.");
  } else {
    console.log("❌ Mismatch!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
