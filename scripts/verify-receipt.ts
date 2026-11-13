/**
 * `pnpm verify:receipt <transfer_id>` — verify a Zermitt receipt with NO
 * keys and NO .env: reads the receipt from the receipts contract via a
 * public RPC view call, recomputes the sha256 over the canonical JSON of
 * the on-chain metadata, and compares it with the on-chain hash.
 */
import { canonicalJson, sha256Hex, type ReceiptMeta } from "../lib/receipts/hash";
import { checkTeeBundle } from "../lib/receipts/tee";
import { loadTeeBundle } from "../lib/receipts/bundle-source";

const CONTRACTS = [
  process.env.RECEIPTS_CONTRACT ?? "receipts-v2.zermitt.testnet",
  "receipts.zermitt.testnet", // v1 — pre-TEE receipts
];
const RPC = process.env.NEAR_NODE_URL ?? "https://rpc.testnet.near.org";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: pnpm verify:receipt <transfer_id>");
    process.exit(2);
  }
  let receipt: { meta: Record<string, unknown>; receipt_hash: string } | null = null;
  let contract = "";
  for (const c of CONTRACTS) {
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
          account_id: c,
          method_name: "get_receipt",
          args_base64: Buffer.from(JSON.stringify({ transfer_id: id })).toString("base64"),
        },
      }),
    });
    const data = (await res.json()) as { result?: { result: number[] } };
    if (!data.result) continue;
    receipt = JSON.parse(Buffer.from(data.result.result).toString());
    if (receipt) {
      contract = c;
      break;
    }
  }
  if (!receipt) {
    console.log(`No receipt on-chain for transfer ${id} (unclaimed, or unknown id).`);
    process.exit(1);
  }

  console.log(`Receipt for ${id} on ${contract}:`);
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

  if (receipt.meta.agent_provider === "nearai") {
    const meta = receipt.meta as unknown as ReceiptMeta;
    console.log(
      `\n🔒 Private agent: model ${meta.model}, TEE signing key ${meta.signing_key}` +
        `\n   attestation hash ${meta.attestation_hash}`
    );
    const found = loadTeeBundle(id);
    if (!found) {
      console.log("   No TEE bundle (local data or fixtures/tee/) for this receipt — signature not checked.");
      return;
    }
    const c = await checkTeeBundle(found.bundle, meta);
    const mark = (b: boolean) => (b ? "✅" : "❌");
    console.log(`   TEE bundle source: ${found.source === "fixture" ? `fixtures/tee/${id}.json` : "local data"}`);
    console.log(`   ${mark(c.signatureRecovers)} signature recovers to signing key`);
    console.log(`   ${mark(c.hashesMatchSignedText)} request/response hashes match signed text`);
    console.log(`   ${mark(c.nonceBound)} attestation bound to request nonce`);
    console.log(`   ${mark(c.reportHashMatchesChain)} sha256(report) = on-chain attestation_hash`);
    console.log(`   ${mark(c.keyAndModelMatchChain)} signing key and model = on-chain fields`);
    console.log(
      c.ok
        ? "✅ TEE proof verified (raw TDX/NVIDIA quotes not checked — needs vendor attestation services)."
        : "❌ TEE proof does not match this receipt."
    );
    if (!c.ok) process.exit(1);
  } else {
    console.log("\nAgent: standard (not private) — no TEE fields on this receipt.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
