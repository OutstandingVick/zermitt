/**
 * Find a TEE signature bundle for a transfer (Node only): the app's local
 * data first, then the committed fixture (fixtures/tee/<id>.json), so a
 * fresh clone can still verify the demo receipts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TeeBundle } from "./tee";

export function loadTeeBundle(
  transferId: string,
  cwd = process.cwd()
): { bundle: TeeBundle; source: "local" | "fixture" } | null {
  const transfersFile = join(cwd, "data", "transfers.json");
  if (existsSync(transfersFile)) {
    const record = (JSON.parse(readFileSync(transfersFile, "utf8")) as Array<{
      id: string;
      agentProof?: {
        model: string;
        chatId: string;
        signedText: string;
        signature: string;
        signingKey: string;
        nonce?: string;
      };
    }>).find((r) => r.id === transferId);
    const p = record?.agentProof;
    const reportFile = p && join(cwd, "data", "attestations", `${p.chatId}.json`);
    if (p && reportFile && existsSync(reportFile)) {
      const raw = readFileSync(reportFile, "utf8");
      const nonce =
        p.nonce ??
        (JSON.parse(raw).model_attestations ?? []).find(
          (a: { signing_address?: string }) =>
            a.signing_address?.toLowerCase() === p.signingKey.toLowerCase()
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
  }
  const fixture = join(cwd, "fixtures", "tee", `${transferId}.json`);
  if (/^[0-9a-f-]{36}$/.test(transferId) && existsSync(fixture)) {
    return { source: "fixture", bundle: JSON.parse(readFileSync(fixture, "utf8")) as TeeBundle };
  }
  return null;
}
