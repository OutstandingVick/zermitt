/**
 * NEAR client helpers: connection, accounts, and (later) relayer plumbing.
 * Phase 0: minimal connect helper used by the spikes.
 */
import { connect, keyStores, KeyPair, type Near } from "near-api-js";
import type { ZermittConfig } from "../config";

export async function connectNear(
  config: ZermittConfig,
  keys?: { accountId: string; privateKey: string }
): Promise<Near> {
  const keyStore = new keyStores.InMemoryKeyStore();
  if (keys) {
    await keyStore.setKey(
      config.networkId,
      keys.accountId,
      KeyPair.fromString(keys.privateKey as never)
    );
  }
  return connect({ networkId: config.networkId, nodeUrl: config.nodeUrl, keyStore });
}

/** Explorer URL for a transaction hash. */
export function txLink(networkId: string, hash: string): string {
  return `https://${networkId === "mainnet" ? "" : "testnet."}nearblocks.io/txns/${hash}`;
}
