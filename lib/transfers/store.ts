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
  /** Present when the parse ran privately on NEAR AI Cloud (TEE). */
  agentProof?: import("../agent/nearai").AgentProof;
  quote: SendQuote;
  route: {
    swapExecution: "mocked-demo" | "live-mainnet";
    claimNetwork: "testnet";
    payoutToken: string;
  };
  transactions: {
    swapTxHash?: string; // only in LIVE_INTENTS mode
    linkFundTxHash?: string;
    accountCreateTxHash?: string;
    claimTxHash?: string;
    storageDepositTxHash?: string;
    payoutTxHash?: string;
    receiptTxHash?: string;
  };
  claimLink?: string;
  /** Public half of the linkdrop claim key, for validating claim requests. */
  claimKeyPublic?: string;
  /** ISO timestamp after which the claim page refuses the link. */
  expiresAt?: string;
  /** Set when claimed. */
  recipientAccountId?: string;
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

export function getTransfer(id: string): TransferRecord | undefined {
  return readAll().find((r) => r.id === id);
}

export type ClaimState =
  | { state: "claimable" }
  | { state: "invalid"; reason: string }
  | { state: "expired" }
  | { state: "already-claimed"; recipientAccountId?: string };

export function claimState(record: TransferRecord | undefined): ClaimState {
  if (!record) return { state: "invalid", reason: "This claim link doesn't exist." };
  if (record.status === "claimed")
    return { state: "already-claimed", recipientAccountId: record.recipientAccountId };
  if (record.status !== "sent")
    return { state: "invalid", reason: `This transfer is not claimable (status: ${record.status}).` };
  if (record.expiresAt && Date.now() > Date.parse(record.expiresAt)) return { state: "expired" };
  return { state: "claimable" };
}
