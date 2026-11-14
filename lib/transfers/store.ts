/**
 * Transfer store. Phase 3's on-chain receipts build on these records.
 *
 * Two backends behind one async API:
 * - Redis (Upstash REST) when KV_REST_API_URL/KV_REST_API_TOKEN (or
 *   UPSTASH_REDIS_REST_URL/_TOKEN) are set — needed on serverless hosts
 *   like Vercel, where the filesystem doesn't persist between requests.
 * - A JSON file (data/transfers.json) otherwise, for local runs.
 * Records include the claim link (with its key), so the store must be private.
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
  /** Display name of the sender, shown on the claim page ("from Victor"). */
  senderName?: string;
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
const ATT_DIR = join(process.cwd(), "data", "attestations");
const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = () => Boolean(REDIS_URL && REDIS_TOKEN);
const K = { transfer: (id: string) => `zermitt:transfer:${id}`, ids: "zermitt:transfers", att: (chatId: string) => `zermitt:att:${chatId}` };

async function redis<T = unknown>(...cmd: Array<string | number>): Promise<T> {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const data = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(`Redis ${cmd[0]} failed: ${data.error ?? res.status}`);
  return data.result as T;
}

function readAll(): TransferRecord[] {
  if (!existsSync(FILE)) return [];
  return JSON.parse(readFileSync(FILE, "utf8")) as TransferRecord[];
}

function writeAll(records: TransferRecord[]): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(records, null, 2));
}

async function save(record: TransferRecord): Promise<void> {
  if (useRedis()) {
    await redis("SET", K.transfer(record.id), JSON.stringify(record));
    await redis("SADD", K.ids, record.id);
    return;
  }
  const records = readAll();
  const i = records.findIndex((r) => r.id === record.id);
  if (i < 0) records.push(record);
  else records[i] = record;
  writeAll(records);
}

export async function createTransfer(partial: Omit<TransferRecord, "id" | "createdAt">): Promise<TransferRecord> {
  const record: TransferRecord = { id: randomUUID(), createdAt: new Date().toISOString(), ...partial };
  await save(record);
  return record;
}

export async function updateTransfer(id: string, patch: Partial<TransferRecord>): Promise<TransferRecord> {
  const current = await getTransfer(id);
  if (!current) throw new Error(`Transfer ${id} not found`);
  const next = { ...current, ...patch };
  await save(next);
  return next;
}

export async function getTransfer(id: string): Promise<TransferRecord | undefined> {
  if (useRedis()) {
    const raw = await redis<string | null>("GET", K.transfer(id));
    return raw ? (JSON.parse(raw) as TransferRecord) : undefined;
  }
  return readAll().find((r) => r.id === id);
}

export async function listTransfers(): Promise<TransferRecord[]> {
  if (useRedis()) {
    const ids = await redis<string[]>("SMEMBERS", K.ids);
    if (!ids.length) return [];
    const raws = await redis<Array<string | null>>("MGET", ...ids.map(K.transfer));
    return raws.filter((r): r is string => Boolean(r)).map((r) => JSON.parse(r) as TransferRecord);
  }
  return readAll();
}

/** Raw NEAR AI attestation report text, keyed by chat id (hash must match exactly). */
export async function saveAttestation(chatId: string, reportText: string): Promise<void> {
  if (useRedis()) {
    await redis("SET", K.att(chatId), reportText);
    return;
  }
  mkdirSync(ATT_DIR, { recursive: true });
  writeFileSync(join(ATT_DIR, `${chatId}.json`), reportText);
}

export async function getAttestation(chatId: string): Promise<string | null> {
  if (useRedis()) return redis<string | null>("GET", K.att(chatId));
  const f = join(ATT_DIR, `${chatId}.json`);
  return existsSync(f) ? readFileSync(f, "utf8") : null;
}

/**
 * Fixed-window rate limit (e.g. sends per IP per hour). Returns true when
 * allowed. In file mode it's per-process memory, which is fine locally.
 */
const memHits = new Map<string, { n: number; until: number }>();
export async function allowRate(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (useRedis()) {
    const k = `zermitt:rate:${key}`;
    const n = await redis<number>("INCR", k);
    if (n === 1) await redis("EXPIRE", k, windowSec);
    return n <= limit;
  }
  const now = Date.now();
  const hit = memHits.get(key);
  if (!hit || hit.until < now) {
    memHits.set(key, { n: 1, until: now + windowSec * 1000 });
    return true;
  }
  hit.n += 1;
  return hit.n <= limit;
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
