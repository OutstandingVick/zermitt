import { describe, expect, it } from "vitest";
import { ParseError, parseIntentFallback } from "../lib/agent/parse";

describe("parseIntentFallback", () => {
  it("parses 'send $50 to mum'", () => {
    expect(parseIntentFallback("send $50 to mum")).toEqual({
      kind: "send",
      amount: 50,
      asset: "USDC",
      recipient: "mum",
    });
  });

  it("parses decimal amounts", () => {
    expect(parseIntentFallback("send $12.50 to dad").amount).toBe(12.5);
  });

  it("parses 'pay 20 usdc to alice'", () => {
    const intent = parseIntentFallback("pay 20 usdc to alice");
    expect(intent).toMatchObject({ amount: 20, asset: "USDC", recipient: "alice" });
  });

  it("parses NEAR as the asset", () => {
    expect(parseIntentFallback("transfer 5 near to bob").asset).toBe("NEAR");
  });

  it("parses USDT as the asset", () => {
    expect(parseIntentFallback("send 30 usdt to carol").asset).toBe("USDT");
  });

  it("normalizes multi-word recipients", () => {
    expect(parseIntentFallback("send $10 to uncle joe").recipient).toBe("uncle-joe");
  });

  it("stops the recipient at a purpose", () => {
    expect(parseIntentFallback("Send $40 to Mum for groceries.")).toMatchObject({ amount: 40, recipient: "mum" });
    expect(parseIntentFallback("send $20 to aunty grace for school fees").recipient).toBe("aunty-grace");
  });

  it("ignores trailing punctuation", () => {
    expect(parseIntentFallback("send $10 to mum!").recipient).toBe("mum");
  });

  it("rejects an empty message", () => {
    expect(() => parseIntentFallback("")).toThrow(ParseError);
  });

  it("rejects non-send requests", () => {
    expect(() => parseIntentFallback("what's my balance?")).toThrow(/only send money/);
  });

  it("rejects a missing amount", () => {
    expect(() => parseIntentFallback("send money to mum")).toThrow(/amount/);
  });

  it("rejects a missing recipient", () => {
    expect(() => parseIntentFallback("send $50")).toThrow(/recipient/);
  });

  it("rejects a zero amount", () => {
    expect(() => parseIntentFallback("send $0 to mum")).toThrow(ParseError);
  });
});
