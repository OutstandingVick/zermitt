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

  it("uses real Google login only with DEMO_MODE=false and a Privy app ID", () => {
    process.env.RELAYER_ACCOUNT_ID = "r.testnet";
    process.env.RELAYER_PRIVATE_KEY = "ed25519:x";
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app-id";
    process.env.DEMO_MODE = "true";
    expect(loadConfig().mockLogin).toBe(true);
    process.env.DEMO_MODE = "false";
    expect(loadConfig().mockLogin).toBe(false);
    delete process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    expect(loadConfig().mockLogin).toBe(true);
  });

  it("fails with a helpful message when production mode lacks a relayer", () => {
    process.env.DEMO_MODE = "false";
    expect(() => loadConfig()).toThrowError(/RELAYER_ACCOUNT_ID/);
    expect(() => loadConfig()).toThrowError(/\.env\.example/);
  });
});
