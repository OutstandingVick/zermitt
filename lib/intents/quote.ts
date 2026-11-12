/**
 * Send quotes via the 1Click API (real mainnet pricing, dry run),
 * with a small in-memory cache keyed by route+amount.
 */
import { getQuote, listTokens, type OneClickToken } from "./oneclick";

export type SendQuote = {
  amountIn: string;
  amountInFormatted: string;
  amountOut: string;
  amountOutFormatted: string;
  amountOutUsd: string;
  /** Difference between in and out, in USD terms. */
  feeUsd: number;
  /** amountOut / amountIn in human units. */
  rate: number;
  timeEstimateSec: number;
  originAssetId: string;
  destinationAssetId: string;
  fetchedAt: string;
  /** This quote is real mainnet pricing; execution may be mocked (DEMO_MODE). */
  pricingSource: "1click-mainnet-dry-quote";
};

type RawQuote = {
  quote: {
    amountIn: string;
    amountInFormatted: string;
    amountInUsd: string;
    amountOut: string;
    amountOutFormatted: string;
    amountOutUsd: string;
    timeEstimate: number;
  };
};

const QUOTE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; quote: SendQuote }>();
let tokensCache: { at: number; tokens: OneClickToken[] } | undefined;

async function tokens(jwt?: string): Promise<OneClickToken[]> {
  if (!tokensCache || Date.now() - tokensCache.at > 10 * 60_000) {
    tokensCache = { at: Date.now(), tokens: await listTokens(jwt) };
  }
  return tokensCache.tokens;
}

export function findAsset(
  list: OneClickToken[],
  symbol: string,
  blockchain = "near"
): OneClickToken {
  const token = list.find((t) => t.symbol === symbol && t.blockchain === blockchain);
  if (!token) throw new Error(`Asset ${symbol} on ${blockchain} not found in 1Click token list.`);
  return token;
}

/**
 * Real dry quote for originSymbol → USDC on NEAR.
 * `amount` is in human units of the origin asset.
 */
export async function getSendQuote(
  originSymbol: string,
  amount: number,
  jwt?: string
): Promise<SendQuote> {
  const key = `${originSymbol}:${amount}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit.quote;

  const list = await tokens(jwt);
  const origin = findAsset(list, originSymbol === "NEAR" ? "wNEAR" : originSymbol);
  const dest = findAsset(list, "USDC");
  const amountRaw = BigInt(Math.round(amount * 10 ** origin.decimals)).toString();

  const raw = (await getQuote(
    {
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: origin.assetId,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: dest.assetId,
      amount: amountRaw,
      // Dry quotes need existing mainnet accounts; intents.near is a stand-in.
      refundTo: "intents.near",
      refundType: "ORIGIN_CHAIN",
      recipient: "intents.near",
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
    },
    jwt
  )) as RawQuote;

  const q = raw.quote;
  const quote: SendQuote = {
    amountIn: q.amountIn,
    amountInFormatted: q.amountInFormatted,
    amountOut: q.amountOut,
    amountOutFormatted: q.amountOutFormatted,
    amountOutUsd: q.amountOutUsd,
    feeUsd: Math.max(0, Number(q.amountInUsd) - Number(q.amountOutUsd)),
    rate: Number(q.amountOutFormatted) / Number(q.amountInFormatted),
    timeEstimateSec: q.timeEstimate,
    originAssetId: origin.assetId,
    destinationAssetId: dest.assetId,
    fetchedAt: new Date().toISOString(),
    pricingSource: "1click-mainnet-dry-quote",
  };
  cache.set(key, { at: Date.now(), quote });
  return quote;
}
