import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../lib/config";

const saved = { ...process.env };

describe("config", () => {
  beforeEach(() => {
    delete process.env.DEMO_MODE;
    delete process.env.RELAYER_ACCOUNT_ID;
    delete process.env.RELAYER_PRIVATE_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("defaults to demo mode on testnet with mock login", () => {
    const config = loadConfig();
    expect(config.demoMode).toBe(true);
    expect(config.networkId).toBe("testnet");
    expect(config.mockLogin).toBe(true);
    expect(config.nodeUrl).toContain("testnet");
  });

  it("fails with a helpful message when production mode lacks a relayer", () => {
    process.env.DEMO_MODE = "false";
    expect(() => loadConfig()).toThrowError(/RELAYER_ACCOUNT_ID/);
    expect(() => loadConfig()).toThrowError(/\.env\.example/);
  });
});
