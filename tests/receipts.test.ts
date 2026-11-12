import { describe, expect, it } from "vitest";
import { canonicalJson, hashReceiptMeta, sha256Hex, type ReceiptMeta } from "../lib/receipts/hash";

const meta: ReceiptMeta = {
  sender_label: "mum",
  recipient_account: "mum.zermitt.testnet",
  amount_usdc: "4992688",
  fee_usd: "0.0044",
  route_summary: "USDC→USDC via NEAR Intents (1Click), claim on NEAR testnet",
  swap_mode: "mocked",
  tx_hashes: ["aaa", "bbb", "ccc"],
  timestamp: "2026-11-12T10:00:00.000Z",
};

describe("canonicalJson", () => {
  it("sorts keys recursively and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [2, { f: 3, e: 4 }] } })).toBe(
      '{"a":{"c":[2,{"e":4,"f":3}]},"b":1}'
    );
  });
  it("is insensitive to key order", () => {
    const shuffled = Object.fromEntries(Object.entries(meta).reverse());
    expect(canonicalJson(shuffled)).toBe(canonicalJson(meta));
  });

  it("agent fields extend the hash only when present (old receipts unaffected)", () => {
    expect(canonicalJson({ ...meta, agent_provider: undefined })).toBe(canonicalJson(meta));
    expect(canonicalJson({ ...meta, agent_provider: "nearai" })).not.toBe(canonicalJson(meta));
  });
});

describe("receipt hash", () => {
  it("is deterministic", async () => {
    const h1 = await hashReceiptMeta(meta);
    const h2 = await hashReceiptMeta({ ...meta });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any field changes", async () => {
    const base = await hashReceiptMeta(meta);
    expect(await hashReceiptMeta({ ...meta, amount_usdc: "4992689" })).not.toBe(base);
    expect(await hashReceiptMeta({ ...meta, swap_mode: "live" })).not.toBe(base);
    expect(await hashReceiptMeta({ ...meta, tx_hashes: ["aaa", "bbb"] })).not.toBe(base);
    expect(await hashReceiptMeta({ ...meta, sender_label: "dad" })).not.toBe(base);
  });

  it("sha256 matches a known vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
