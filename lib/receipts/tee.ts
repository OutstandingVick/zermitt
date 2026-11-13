/**
 * Offline check of a TEE signature bundle against an on-chain receipt.
 * Pure (WebCrypto + ethers): runs in Node and the browser, needs no keys.
 */
import { verifyMessage } from "ethers";
import { sha256Hex, type ReceiptMeta } from "./hash";

/** Exported per receipt to fixtures/tee/<transfer_id>.json. */
export type TeeBundle = {
  transfer_id: string;
  model: string;
  chat_id: string;
  /** "<sha256(request)>:<sha256(response)>" as signed inside the TEE. */
  signed_text: string;
  request_hash: string;
  response_hash: string;
  signature: string;
  signing_address: string;
  nonce: string;
  /** Exact attestation report text; its sha256 is the on-chain attestation_hash. */
  attestation_report_raw: string;
};

export type TeeCheck = {
  signatureRecovers: boolean;
  hashesMatchSignedText: boolean;
  nonceBound: boolean;
  reportHashMatchesChain: boolean;
  keyAndModelMatchChain: boolean;
  ok: boolean;
};

export async function checkTeeBundle(bundle: TeeBundle, meta: ReceiptMeta): Promise<TeeCheck> {
  const addr = bundle.signing_address.toLowerCase();

  let signatureRecovers = false;
  try {
    signatureRecovers = verifyMessage(bundle.signed_text, bundle.signature).toLowerCase() === addr;
  } catch {}

  const parts = bundle.signed_text.split(":");
  const [reqH, respH] = parts.slice(-2);
  const hashesMatchSignedText = reqH === bundle.request_hash && respH === bundle.response_hash;

  let nonceBound = false;
  try {
    const report = JSON.parse(bundle.attestation_report_raw) as {
      model_attestations?: Array<{ signing_address?: string; request_nonce?: string }>;
    };
    nonceBound = (report.model_attestations ?? []).some(
      (a) => a.signing_address?.toLowerCase() === addr && a.request_nonce === bundle.nonce
    );
  } catch {}

  const reportHashMatchesChain =
    (await sha256Hex(bundle.attestation_report_raw)) === meta.attestation_hash;
  const keyAndModelMatchChain =
    (meta.signing_key ?? "").toLowerCase() === addr && meta.model === bundle.model;

  return {
    signatureRecovers,
    hashesMatchSignedText,
    nonceBound,
    reportHashMatchesChain,
    keyAndModelMatchChain,
    ok:
      signatureRecovers &&
      hashesMatchSignedText &&
      nonceBound &&
      reportHashMatchesChain &&
      keyAndModelMatchChain,
  };
}
