/**
 * LLM intent parsing — Phase 0 stub.
 * Phase 1 will call an LLM to turn "send $50 to mum" into a structured intent.
 */

export type SendIntent = {
  kind: "send";
  amountUsd: number;
  recipientAlias: string; // e.g. "mum" → resolved to mum.zermitt.near later
};

export function parseIntentStub(_text: string): SendIntent {
  throw new Error("Not implemented in Phase 0 — see scripts/demo-e2e.ts for the planned flow.");
}
