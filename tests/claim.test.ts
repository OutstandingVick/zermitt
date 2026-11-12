import { describe, expect, it } from "vitest";
import { validateName, suggestName } from "../lib/near/names";
import { claimState, type TransferRecord } from "../lib/transfers/store";

describe("validateName", () => {
  it("accepts simple names", () => {
    expect(validateName("mum")).toEqual({ ok: true, accountId: "mum.zermitt.testnet" });
  });
  it("accepts dashes and numbers", () => {
    expect(validateName("uncle-joe2").ok).toBe(true);
  });
  it("lowercases and trims", () => {
    expect(validateName("  MUM ")).toEqual({ ok: true, accountId: "mum.zermitt.testnet" });
  });
  it("rejects too-short names", () => {
    expect(validateName("m").ok).toBe(false);
  });
  it("rejects names that overflow 64 chars total", () => {
    expect(validateName("a".repeat(60)).ok).toBe(false);
  });
  it("rejects illegal characters", () => {
    expect(validateName("mum!").ok).toBe(false);
    expect(validateName("mu m").ok).toBe(false);
    expect(validateName("mum.near").ok).toBe(false);
  });
  it("rejects leading/trailing/double separators", () => {
    expect(validateName("-mum").ok).toBe(false);
    expect(validateName("mum-").ok).toBe(false);
    expect(validateName("mu--m").ok).toBe(false);
  });
  it("rejects reserved words", () => {
    expect(validateName("admin").ok).toBe(false);
    expect(validateName("zermitt").ok).toBe(false);
  });
});

describe("suggestName", () => {
  it("normalizes aliases", () => {
    expect(suggestName("Uncle Joe")).toBe("uncle-joe");
  });
});

function record(patch: Partial<TransferRecord>): TransferRecord {
  return {
    id: "t1",
    createdAt: new Date().toISOString(),
    request: { text: "", intent: { kind: "send", amount: 5, asset: "USDC", recipient: "mum" } },
    quote: {} as TransferRecord["quote"],
    route: { swapExecution: "mocked-demo", claimNetwork: "testnet", payoutToken: "usdc.fakes.testnet" },
    transactions: {},
    status: "sent",
    ...patch,
  };
}

describe("claimState", () => {
  it("missing record is invalid", () => {
    expect(claimState(undefined).state).toBe("invalid");
  });
  it("sent + unexpired is claimable", () => {
    expect(claimState(record({ expiresAt: new Date(Date.now() + 1000).toISOString() })).state).toBe("claimable");
  });
  it("expired links are expired", () => {
    expect(claimState(record({ expiresAt: new Date(Date.now() - 1000).toISOString() })).state).toBe("expired");
  });
  it("claimed records report already-claimed", () => {
    const s = claimState(record({ status: "claimed", recipientAccountId: "mum.zermitt.testnet" }));
    expect(s).toEqual({ state: "already-claimed", recipientAccountId: "mum.zermitt.testnet" });
  });
  it("quoted (unsent) records are invalid", () => {
    expect(claimState(record({ status: "quoted" })).state).toBe("invalid");
  });
});

describe("USDC amount conversion (6 decimals)", () => {
  it("raw → dollars", () => {
    expect(Number("4994835") / 1e6).toBeCloseTo(4.994835);
  });
  it("dollars → raw, rounding safely", () => {
    expect(BigInt(Math.round(7.25 * 1e6)).toString()).toBe("7250000");
    expect(BigInt(Math.round(0.000001 * 1e6)).toString()).toBe("1");
  });
});
