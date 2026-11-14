import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "zermitt-store-"));
process.env.TRANSFERS_FILE = join(dir, "transfers.json");

describe("transfer store", () => {
  let store: typeof import("../lib/transfers/store");
  beforeAll(async () => {
    store = await import("../lib/transfers/store");
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("persists a receipt hash written after the claim, keeping the claim tx hashes", async () => {
    const t = await store.createTransfer({
      request: { text: "send $3 to grandma", intent: { kind: "send", amount: 3, asset: "USDC", recipient: "grandma" } },
      quote: {} as never,
      route: { swapExecution: "mocked-demo", claimNetwork: "testnet", payoutToken: "usdc.fakes.testnet" },
      transactions: { linkFundTxHash: "fund" },
      status: "sent",
    });
    // Claim step: status + claim tx hashes.
    const claimed = await store.updateTransfer(t.id, {
      status: "claimed",
      transactions: { ...t.transactions, claimTxHash: "claim", payoutTxHash: "payout" },
    });
    // Receipt step (recordReceipt): merges the receipt hash onto the claimed record.
    await store.updateTransfer(t.id, { transactions: { ...claimed.transactions, receiptTxHash: "receipt" } });

    const saved = (await store.getTransfer(t.id))!;
    expect(saved.status).toBe("claimed");
    expect(saved.transactions).toEqual({
      linkFundTxHash: "fund",
      claimTxHash: "claim",
      payoutTxHash: "payout",
      receiptTxHash: "receipt",
    });
  });

  it("rate-limits per key within a window", async () => {
    expect(await store.allowRate("ip:test", 2, 3600)).toBe(true);
    expect(await store.allowRate("ip:test", 2, 3600)).toBe(true);
    expect(await store.allowRate("ip:test", 2, 3600)).toBe(false);
    expect(await store.allowRate("ip:other", 2, 3600)).toBe(true);
  });
});
