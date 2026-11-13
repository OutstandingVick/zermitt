import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { checkTeeBundle, type TeeBundle } from "../lib/receipts/tee";
import { sha256Hex, type ReceiptMeta } from "../lib/receipts/hash";

const dir = join(__dirname, "..", "fixtures", "tee");
const file = readdirSync(dir).find((f) => f.endsWith(".json"))!;
const bundle = JSON.parse(readFileSync(join(dir, file), "utf8")) as TeeBundle;

async function metaFor(b: TeeBundle): Promise<ReceiptMeta> {
  return {
    sender_label: "mum",
    recipient_account: "x.zermitt.testnet",
    amount_usdc: "1",
    fee_usd: "0",
    route_summary: "",
    swap_mode: "mocked",
    tx_hashes: [],
    timestamp: "",
    agent_provider: "nearai",
    model: b.model,
    attestation_hash: await sha256Hex(b.attestation_report_raw),
    signing_key: b.signing_address,
  };
}

describe("TEE bundle check (committed fixture, offline)", () => {
  it("passes for the untouched fixture", async () => {
    expect((await checkTeeBundle(bundle, await metaFor(bundle))).ok).toBe(true);
  });

  it("fails when the signed response hash is tampered", async () => {
    const h = bundle.response_hash;
    const t = h.slice(0, -1) + (h.endsWith("0") ? "1" : "0");
    const tampered = { ...bundle, signed_text: `${bundle.request_hash}:${t}`, response_hash: t };
    const c = await checkTeeBundle(tampered, await metaFor(bundle));
    expect(c.signatureRecovers).toBe(false);
    expect(c.ok).toBe(false);
  });

  it("fails on a wrong nonce", async () => {
    const c = await checkTeeBundle({ ...bundle, nonce: "00".repeat(32) }, await metaFor(bundle));
    expect(c.nonceBound).toBe(false);
  });

  it("fails when the report differs from the on-chain attestation_hash", async () => {
    const meta = await metaFor(bundle);
    const c = await checkTeeBundle({ ...bundle, attestation_report_raw: bundle.attestation_report_raw + " " }, meta);
    expect(c.reportHashMatchesChain).toBe(false);
  });

  it("fails when the on-chain signing key differs", async () => {
    const meta = { ...(await metaFor(bundle)), signing_key: "0x" + "0".repeat(40) };
    expect((await checkTeeBundle(bundle, meta)).keyAndModelMatchChain).toBe(false);
  });
});
