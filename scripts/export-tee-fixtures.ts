/**
 * Export TEE signature bundles for claimed private-agent transfers to
 * fixtures/tee/<transfer_id>.json, so a fresh clone can verify them.
 * Usage: tsx scripts/export-tee-fixtures.ts <transfer_id> [...]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getTransfer } from "../lib/transfers/store";
import type { TeeBundle } from "../lib/receipts/tee";

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Usage: tsx scripts/export-tee-fixtures.ts <transfer_id> [...]");
  process.exit(2);
}
const outDir = join(process.cwd(), "fixtures", "tee");
mkdirSync(outDir, { recursive: true });

for (const id of ids) {
  const p = getTransfer(id)?.agentProof;
  if (!p) throw new Error(`${id}: no agent proof`);
  const raw = readFileSync(join(process.cwd(), "data", "attestations", `${p.chatId}.json`), "utf8");
  // Older proofs didn't store the nonce; recover it from the report entry for this signer.
  const nonce =
    p.nonce ??
    (JSON.parse(raw).model_attestations ?? []).find(
      (a: { signing_address?: string }) =>
        a.signing_address?.toLowerCase() === p.signingKey.toLowerCase()
    )?.request_nonce;
  const [request_hash, response_hash] = p.signedText.split(":").slice(-2);
  const bundle: TeeBundle = {
    transfer_id: id,
    model: p.model,
    chat_id: p.chatId,
    signed_text: p.signedText,
    request_hash,
    response_hash,
    signature: p.signature,
    signing_address: p.signingKey,
    nonce,
    attestation_report_raw: raw,
  };
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(bundle, null, 2) + "\n");
  console.log(`wrote fixtures/tee/${id}.json`);
}
