/**
 * Central config. Reads env vars, applies DEMO_MODE defaults, and fails
 * with a helpful message when a required variable is missing.
 */

export type ZermittConfig = {
  demoMode: boolean;
  networkId: "testnet" | "mainnet";
  nodeUrl: string;
  /** Testnet account that pays gas for meta-transactions in demo mode. */
  relayerAccountId: string | undefined;
  relayerPrivateKey: string | undefined;
  /** Optional 1Click API JWT — lowers fees, not required for dry quotes. */
  oneClickJwt: string | undefined;
  /** Allow the mocked Google login path (judges don't need real accounts). */
  mockLogin: boolean;
  /** Optional Anthropic key for LLM parsing; demo falls back to a deterministic parser. */
  anthropicApiKey: string | undefined;
  /** Run a REAL small mainnet Intents swap. Off by default. */
  liveIntents: boolean;
  /** NEP-141 test stablecoin used for payouts on testnet. */
  testUsdcContract: string;
  /** Mainnet account for LIVE_INTENTS only. */
  mainnetAccountId: string | undefined;
  mainnetPrivateKey: string | undefined;
};

function fail(name: string, hint: string): never {
  throw new Error(
    `Missing required env var ${name}. ${hint}\n` +
      `Copy .env.example to .env and fill it in — each variable is documented there.`
  );
}

export function loadConfig(): ZermittConfig {
  const demoMode = (process.env.DEMO_MODE ?? "true") !== "false";
  const networkId = demoMode ? "testnet" : (process.env.NEAR_NETWORK as "testnet" | "mainnet") ?? "testnet";

  const config: ZermittConfig = {
    demoMode,
    networkId,
    nodeUrl: process.env.NEAR_NODE_URL ?? `https://rpc.${networkId}.near.org`,
    relayerAccountId: process.env.RELAYER_ACCOUNT_ID,
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY,
    oneClickJwt: process.env.ONECLICK_JWT,
    mockLogin: demoMode && (process.env.MOCK_LOGIN ?? "true") !== "false",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    liveIntents: process.env.LIVE_INTENTS === "true",
    testUsdcContract: process.env.TEST_USDC_CONTRACT ?? "usdc.fakes.testnet",
    mainnetAccountId: process.env.MAINNET_ACCOUNT_ID,
    mainnetPrivateKey: process.env.MAINNET_PRIVATE_KEY,
  };

  if (config.liveIntents) {
    if (!config.mainnetAccountId)
      fail("MAINNET_ACCOUNT_ID", "LIVE_INTENTS=true runs a REAL mainnet swap and needs a funded mainnet account.");
    if (!config.mainnetPrivateKey)
      fail("MAINNET_PRIVATE_KEY", "Full-access key for MAINNET_ACCOUNT_ID (ed25519:...).");
  }

  if (!demoMode) {
    // Production mode requires a real relayer.
    if (!config.relayerAccountId)
      fail("RELAYER_ACCOUNT_ID", "The NEAR account that pays gas for users' meta-transactions.");
    if (!config.relayerPrivateKey)
      fail("RELAYER_PRIVATE_KEY", "Full-access key for the relayer account (ed25519:...).");
  }

  return config;
}

/** For scripts that need the relayer even in demo mode (spikes). */
export function requireRelayer(config: ZermittConfig): { accountId: string; privateKey: string } {
  if (!config.relayerAccountId)
    fail("RELAYER_ACCOUNT_ID", "Create a testnet account (https://wallet.testnet.near.org or `near account create-account sponsor-by-faucet-service`).");
  if (!config.relayerPrivateKey)
    fail("RELAYER_PRIVATE_KEY", "The ed25519 private key for RELAYER_ACCOUNT_ID.");
  return { accountId: config.relayerAccountId, privateKey: config.relayerPrivateKey };
}
