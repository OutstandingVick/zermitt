/**
 * Private parsing via NEAR AI Cloud (TEE-hosted, OpenAI-compatible), with
 * per-request cryptographic proof.
 *
 * Protocol (from NEAR AI's official verifier, github.com/nearai/nearai-cloud-verifier):
 *   POST {BASE}/v1/chat/completions                       — inference
 *   GET  {BASE}/v1/signature/{chatId}?model=&signing_algo=ecdsa
 *        → { text: "<sha256(req)>:<sha256(resp)>", signature, signing_address }
 *        signature is an Ethereum personal-message ECDSA sig over `text`.
 *   GET  {BASE}/v1/attestation/report?model=&nonce=&signing_algo=ecdsa&signing_address=
 *        → TDX quote + NVIDIA evidence for the enclave holding that key.
 *
 * What we verify locally: request/response hashes match the signed text,
 * and the ECDSA signature recovers to the attested signing address.
 * What we do NOT verify here: the TDX/NVIDIA quotes themselves (that needs
 * Intel/NVIDIA attestation services — see the verifier repo and README).
 */
import { createHash, randomBytes } from "node:crypto";
import { verifyMessage } from "ethers";
import type { SendIntent } from "./parse";

export const NEARAI_BASE_URL = process.env.NEARAI_BASE_URL ?? "https://cloud-api.near.ai";
/**
 * Cheapest model (Nov 2026 catalog) whose /v1/attestation/report returns
 * Intel TDX + NVIDIA evidence bound to a signing address. Proxied models
 * (OpenAI/Anthropic/Google/OpenRouter-routed) return 503 there and can't
 * be attested.
 */
export const NEARAI_MODEL = process.env.NEARAI_MODEL ?? "z-ai/glm-5.3-flash";
/** Parse output is a ~40-token JSON object; cap spend per request. */
export const NEARAI_MAX_TOKENS = 100;

export type AgentProof = {
  provider: "nearai";
  model: string;
  chatId: string;
  /** sha256 (hex) of the full attestation report JSON. */
  attestationHash: string;
  /** The TEE's signing address (ECDSA/Ethereum format). */
  signingKey: string;
  signature: string;
  /** The signed text: "<sha256(request)>:<sha256(response)>". */
  signedText: string;
  /** Hashes matched and the signature recovered to the attested key. */
  verified: boolean;
  checkedAt: string;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const SYSTEM_PROMPT =
  "Parse a remittance request into JSON: " +
  `{"amount": number, "asset": "USDC"|"USDT"|"NEAR", "recipient": string}. ` +
  'Default asset is USDC. "recipient" is the name/alias as written, lowercase, spaces→dashes. ' +
  'If the message is not a send request or lacks an amount or recipient, reply {"error": "<short reason>"}. ' +
  "Reply with JSON only.";

export async function parseIntentNearai(
  text: string,
  apiKey: string
): Promise<{ intent: SendIntent; proof: AgentProof }> {
  const requestBody = JSON.stringify({
    model: NEARAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    stream: false,
    max_tokens: NEARAI_MAX_TOKENS,
  });

  const res = await fetch(`${NEARAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: requestBody,
  });
  const rawResponse = await res.text();
  if (!res.ok) throw new Error(`NEAR AI Cloud failed (${res.status}): ${rawResponse.slice(0, 300)}`);
  const data = JSON.parse(rawResponse) as {
    id: string;
    model: string;
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(content.replace(/^```(json)?|```$/g, "").trim());
  if (parsed.error) throw new Error(parsed.error);
  const intent: SendIntent = {
    kind: "send",
    amount: parsed.amount,
    asset: parsed.asset ?? "USDC",
    recipient: parsed.recipient,
  };

  const proof = await collectProof(data.id, data.model ?? NEARAI_MODEL, requestBody, rawResponse, apiKey);
  return { intent, proof };
}

export async function collectProof(
  chatId: string,
  model: string,
  requestBody: string,
  rawResponse: string,
  apiKey: string
): Promise<AgentProof> {
  const auth = { Authorization: `Bearer ${apiKey}` };

  // 1. Signature over request/response hashes.
  const sigRes = await fetch(
    `${NEARAI_BASE_URL}/v1/signature/${encodeURIComponent(chatId)}?model=${encodeURIComponent(model)}&signing_algo=ecdsa`,
    { headers: auth }
  );
  if (!sigRes.ok) throw new Error(`signature fetch failed (${sigRes.status})`);
  const sig = (await sigRes.json()) as { text: string; signature: string; signing_address: string };

  const parts = sig.text.split(":");
  const reqHashServer = parts.length === 3 ? parts[1] : parts[0];
  const respHashServer = parts.length === 3 ? parts[2] : parts[1];
  const hashesMatch = sha256(requestBody) === reqHashServer && sha256(rawResponse) === respHashServer;

  let signatureValid = false;
  try {
    signatureValid = verifyMessage(sig.text, sig.signature).toLowerCase() === sig.signing_address.toLowerCase();
  } catch {
    signatureValid = false;
  }

  // 2. Fresh attestation report for that signing address.
  const nonce = randomBytes(32).toString("hex");
  const attRes = await fetch(
    `${NEARAI_BASE_URL}/v1/attestation/report?model=${encodeURIComponent(model)}&nonce=${nonce}&signing_algo=ecdsa&signing_address=${encodeURIComponent(sig.signing_address)}`,
    { headers: auth }
  );
  if (!attRes.ok) throw new Error(`attestation fetch failed (${attRes.status})`);
  const reportText = await attRes.text();
  const report = JSON.parse(reportText) as {
    model_attestations?: Array<{ signing_address?: string; request_nonce?: string }>;
  };
  // The signer must appear in a model attestation that echoes our fresh nonce.
  const attested = (report.model_attestations ?? []).some(
    (a) =>
      a.signing_address?.toLowerCase() === sig.signing_address.toLowerCase() &&
      (a.request_nonce === undefined || a.request_nonce === nonce)
  );

  // Persist the raw report so the receipt page can link to it.
  try {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "data", "attestations");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${chatId}.json`), reportText);
  } catch (err) {
    console.warn("Could not persist attestation report:", err);
  }

  return {
    provider: "nearai",
    model,
    chatId,
    attestationHash: sha256(reportText),
    signingKey: sig.signing_address,
    signature: sig.signature,
    signedText: sig.text,
    verified: hashesMatch && signatureValid && attested,
    checkedAt: new Date().toISOString(),
  };
}
