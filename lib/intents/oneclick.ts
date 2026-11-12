/**
 * Thin wrapper over the NEAR Intents 1Click API.
 * Docs: https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart
 *
 * NOTE: NEAR Intents has NO testnet — the official docs recommend small
 * mainnet swaps for testing. Dry quotes (`dry: true`) are free, read-only,
 * and need no funds, so Phase 0 uses those.
 */

const BASE_URL = "https://1click.chaindefuser.com";

export type OneClickToken = {
  assetId: string;
  blockchain: string;
  symbol: string;
  decimals: number;
  price?: number;
};

export type QuoteRequest = {
  dry: boolean;
  swapType: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippageTolerance: number; // basis points
  originAsset: string;
  depositType: "ORIGIN_CHAIN" | "INTENTS";
  destinationAsset: string;
  amount: string; // smallest units
  refundTo: string;
  refundType: "ORIGIN_CHAIN" | "INTENTS";
  recipient: string;
  recipientType: "DESTINATION_CHAIN" | "INTENTS";
  deadline: string; // ISO timestamp
};

async function request<T>(path: string, init?: RequestInit, jwt?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`1Click API ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export function listTokens(jwt?: string): Promise<OneClickToken[]> {
  return request<OneClickToken[]>("/v0/tokens", undefined, jwt);
}

export function getQuote(req: QuoteRequest, jwt?: string): Promise<unknown> {
  return request("/v0/quote", { method: "POST", body: JSON.stringify(req) }, jwt);
}

export function getStatus(depositAddress: string, jwt?: string): Promise<unknown> {
  return request(`/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`, undefined, jwt);
}
