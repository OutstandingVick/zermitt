/**
 * Sender balances on testnet: native NEAR plus known NEP-141 tokens.
 * Used to pick which asset funds a send.
 */
import type { Near } from "near-api-js";
import type { ZermittConfig } from "../config";

export type Balance = {
  symbol: string;
  /** Smallest units as a decimal string. */
  raw: string;
  decimals: number;
  /** Human-readable amount. */
  amount: number;
  contract?: string; // undefined = native NEAR
};

export async function getBalances(
  near: Near,
  config: ZermittConfig,
  accountId: string
): Promise<Balance[]> {
  const account = await near.account(accountId);
  const out: Balance[] = [];

  const state = await account.state();
  const nearRaw = state.amount.toString();
  out.push({
    symbol: "NEAR",
    raw: nearRaw,
    decimals: 24,
    amount: Number(nearRaw) / 1e24,
  });

  // Known test tokens (just USDC.e for now).
  for (const contract of [config.testUsdcContract]) {
    try {
      const raw = (await account.viewFunction({
        contractId: contract,
        methodName: "ft_balance_of",
        args: { account_id: accountId },
      })) as string;
      const meta = (await account.viewFunction({
        contractId: contract,
        methodName: "ft_metadata",
        args: {},
      })) as { symbol: string; decimals: number };
      out.push({
        symbol: meta.symbol,
        raw,
        decimals: meta.decimals,
        amount: Number(raw) / 10 ** meta.decimals,
        contract,
      });
    } catch {
      // Token not registered for this account — skip.
    }
  }
  return out;
}

/**
 * Pick the asset that funds a send of `amountUsd`.
 * Preference: stablecoin balance if sufficient, else NEAR.
 */
export function pickSpendAsset(balances: Balance[], amountUsd: number): Balance | undefined {
  const stable = balances.find((b) => b.symbol.startsWith("USDC") && b.amount >= amountUsd);
  if (stable) return stable;
  return balances.find((b) => b.symbol === "NEAR" && b.amount > 2); // keep gas headroom
}
