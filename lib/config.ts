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
  /** NEAR AI Cloud key for private TEE parsing (AGENT_PROVIDER=nearai). */
  nearaiApiKey: string | undefined;
  /** Which parser runs: nearai (private/TEE) | anthropic | fallback. */
  agentProvider: "nearai" | "anthropic" | "fallback";
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
    // Real Google login (Privy) only outside demo mode and with an app ID;
    // everything else uses the mocked login so judges need no accounts.
    mockLogin: demoMode || !process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    nearaiApiKey: process.env.NEARAI_API_KEY,
    agentProvider:
      (process.env.AGENT_PROVIDER as "nearai" | "anthropic" | "fallback" | undefined) ??
      (process.env.NEARAI_API_KEY ? "nearai" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "fallback"),
    liveIntents: process.env.LIVE_INTENTS === "true",
    testUsdcContract: process.env.TEST_USDC_CONTRACT ?? "usdc.fakes.testnet",
    mainnetAccountId: process.env.MAINNET_ACCOUNT_ID,
    mainnetPrivateKey: process.env.MAINNET_PRIVATE_KEY,
  };

  if (config.agentProvider === "nearai" && !config.nearaiApiKey)
    fail("NEARAI_API_KEY", "AGENT_PROVIDER=nearai needs a NEAR AI Cloud API key (https://cloud.near.ai).");

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
    fail("RELAYER_ACCOUNT_ID", "Create a funded testnet account: `npx near-cli-rs account create-account sponsor-by-faucet-service <name>.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create`.");
  if (!config.relayerPrivateKey)
    fail("RELAYER_PRIVATE_KEY", "The ed25519 private key for RELAYER_ACCOUNT_ID.");
  return { accountId: config.relayerAccountId, privateKey: config.relayerPrivateKey };
}
