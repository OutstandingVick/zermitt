/**
 * Deterministic receipt hash: sha256 (hex) over canonical JSON (keys sorted
 * recursively, no whitespace) of EXACTLY the metadata stored on-chain.
 * Anyone can recompute it from the contract data alone — no database needed.
 * Runs in Node and the browser (WebCrypto).
 */
import type { TransferRecord } from "../transfers/store";

/** Mirrors the contract's ReceiptMeta. The hash commits to these fields. */
export type ReceiptMeta = {
  sender_label: string;
  recipient_account: string;
  /** USDC in raw 6-decimal units. */
  amount_usdc: string;
  fee_usd: string;
  route_summary: string;
  swap_mode: "mocked" | "live";
  tx_hashes: string[];
  timestamp: string;
  /** Present only for transfers parsed privately on NEAR AI Cloud (TEE).
   *  Absent fields stay out of the canonical JSON, so old receipts verify. */
  agent_provider?: string;
  model?: string;
  attestation_hash?: string;
  signing_key?: string;
};

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(",")}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build the on-chain metadata (and hash input) from a claimed transfer. */
export function buildReceiptMeta(t: TransferRecord): ReceiptMeta {
  const tx = t.transactions;
  return {
    sender_label: t.request.intent.recipient,
    recipient_account: t.recipientAccountId ?? "",
    amount_usdc: t.quote.amountOut,
    fee_usd: String(t.quote.feeUsd),
    route_summary: `${t.request.intent.asset}→USDC via NEAR Intents (1Click), claim on NEAR ${t.route.claimNetwork}`,
    swap_mode: t.route.swapExecution === "live-mainnet" ? "live" : "mocked",
    tx_hashes: [
      tx.linkFundTxHash,
      tx.accountCreateTxHash,
      tx.claimTxHash,
      tx.storageDepositTxHash,
      tx.payoutTxHash,
      ...(tx.swapTxHash ? [tx.swapTxHash] : []),
    ].filter((h): h is string => Boolean(h)),
    timestamp: t.createdAt,
    ...(t.agentProof?.provider === "nearai"
      ? {
          agent_provider: t.agentProof.provider,
          model: t.agentProof.model,
          attestation_hash: t.agentProof.attestationHash,
          signing_key: t.agentProof.signingKey,
        }
      : {}),
  };
}

/** The receipt hash: recomputable by anyone from the on-chain meta alone. */
export function hashReceiptMeta(meta: ReceiptMeta): Promise<string> {
  return sha256Hex(canonicalJson(meta));
}
