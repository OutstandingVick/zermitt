/**
 * Find a TEE signature bundle for a transfer (Node only): the app's own
 * store first (file locally, Redis when deployed), then the committed
 * fixture (fixtures/tee/<id>.json), so a fresh clone can still verify the
 * demo receipts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TeeBundle } from "./tee";
import { getAttestation, getTransfer } from "../transfers/store";

export async function loadTeeBundle(
  transferId: string,
  cwd = process.cwd()
): Promise<{ bundle: TeeBundle; source: "local" | "fixture" } | null> {
  const p = (await getTransfer(transferId).catch(() => undefined))?.agentProof;
  const raw = p ? await getAttestation(p.chatId).catch(() => null) : null;
  if (p && raw) {
    const nonce =
      p.nonce ??
      (JSON.parse(raw).model_attestations ?? []).find(
        (a: { signing_address?: string }) => a.signing_address?.toLowerCase() === p.signingKey.toLowerCase()
      )?.request_nonce;
    const [request_hash, response_hash] = p.signedText.split(":").slice(-2);
    return {
      source: "local",
      bundle: {
        transfer_id: transferId,
        model: p.model,
        chat_id: p.chatId,
        signed_text: p.signedText,
        request_hash,
        response_hash,
        signature: p.signature,
        signing_address: p.signingKey,
        nonce,
        attestation_report_raw: raw,
      },
    };
  }
  const fixture = join(cwd, "fixtures", "tee", `${transferId}.json`);
  if (/^[0-9a-f-]{36}$/.test(transferId) && existsSync(fixture)) {
    return { source: "fixture", bundle: JSON.parse(readFileSync(fixture, "utf8")) as TeeBundle };
  }
  return null;
}
