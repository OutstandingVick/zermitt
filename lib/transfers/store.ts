/**
 * Transfer store: JSON file on disk (data/transfers.json).
 * Phase 3's on-chain receipts build on these records.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { SendIntent } from "../agent/parse";
import type { SendQuote } from "../intents/quote";

export type TransferRecord = {
  id: string;
  createdAt: string;
  request: { text: string; intent: SendIntent };
  quote: SendQuote;
  route: {
    swapExecution: "mocked-demo" | "live-mainnet";
    claimNetwork: "testnet";
    payoutToken: string;
  };
  transactions: {
    swapTxHash?: string; // only in LIVE_INTENTS mode
    linkFundTxHash?: string;
    payoutTxHash?: string;
  };
  claimLink?: string;
  status: "quoted" | "sent" | "claimed" | "failed";
};

const FILE = process.env.TRANSFERS_FILE ?? join(process.cwd(), "data", "transfers.json");

function readAll(): TransferRecord[] {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf8")) as TransferRecord[];
}

function writeAll(records: TransferRecord[]): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(records, null, 2));
}

export function createTransfer(
  partial: Omit<TransferRecord, "id" | "createdAt">
): TransferRecord {
  const record: TransferRecord = { id: randomUUID(), createdAt: new Date().toISOString(), ...partial };
  writeAll([...readAll(), record]);
  return record;
}

export function updateTransfer(id: string, patch: Partial<TransferRecord>): TransferRecord {
  const records = readAll();
  const i = records.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`Transfer ${id} not found`);
  records[i] = { ...records[i], ...patch };
  writeAll(records);
  return records[i];
}

export function listTransfers(): TransferRecord[] {
  return readAll();
}
