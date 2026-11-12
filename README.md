# Zermitt

**Send money with a sentence.** Zermitt is an AI remittance agent on NEAR: a
sender types "send $50 to mum", the agent routes funds from any asset or chain
into USDC on NEAR via NEAR Intents, and the recipient claims it with a Google
sign-in — no wallet, no gas, no crypto vocabulary.

**The problem:** remittances are slow, fee-heavy, and assume both sides speak
crypto. Zermitt makes the sender side one sentence and the recipient side one
Google login, with a public receipt for every transfer.

> **Status: Phase 1.** Chat-to-send works end to end in demo mode: sentence →
> real quote → confirm → real testnet claim link. The Intents swap execution
> is **mocked in DEMO_MODE** (Intents has no testnet) and clearly labeled;
> quotes are real mainnet pricing. The features table below is exact.

## Quick start

```bash
pnpm install
cp .env.example .env   # DEMO_MODE=true needs no secrets
pnpm dev               # http://localhost:3000
```

Other commands:

```bash
pnpm test              # vitest sanity tests
pnpm demo:e2e          # end-to-end skeleton (prints TODO steps, exits 0)
pnpm spike:intents     # real 1Click dry quote → USDC on NEAR (no funds needed)
pnpm spike:claim       # testnet claim link: fund + claim (needs RELAYER_* in .env)
```

## Features

| Feature | Status |
| --- | --- |
| Chat-to-send ("send $50 to mum") | ✅ (LLM with ANTHROPIC_API_KEY, deterministic fallback without) |
| Any-asset routing (NEAR Intents) | ✅ live quotes · 🧪 execution mocked in DEMO_MODE (`LIVE_INTENTS=true` for a real mainnet swap) |
| Quote and confirm before sending | ✅ |
| Claim links | ✅ creation on testnet (claiming in-app is Phase 2) |
| Google sign-in | 🗺️ Roadmap |
| Named sub-accounts (`mum.zermitt.near`) | 🗺️ Roadmap |
| Gasless meta-transactions | 🗺️ Roadmap |
| Dollar balance | 🗺️ Roadmap |
| Receipt page | 🗺️ Roadmap |
| On-chain receipt contract | 🗺️ Roadmap |
| Fee comparison | 🗺️ Roadmap |
| Private agent (NEAR AI Cloud attestation) | 🗺️ Roadmap |

## Spike findings (Phase 0)

1. **NEAR Intents has no testnet.** Official docs recommend small mainnet
   swaps. `pnpm spike:intents` fetches a real mainnet **dry quote**
   (free, read-only) for USDT → USDC on NEAR. Executing swaps needs a funded
   mainnet account (Phase 1 decision).
2. **Social login:** FastAuth is deprecated. Chosen: **Privy** (per the
   official NEAR social-login tutorial), with a mocked Google path in
   DEMO_MODE so judges need no accounts. Details:
   [scripts/spikes/02-social-login.md](scripts/spikes/02-social-login.md).
3. **Claim links:** `pnpm spike:claim` uses the NEP-452 linkdrop contract at
   the `testnet` account — funds a link and claims it into a newly created
   account, printing both transaction hashes.

## How to verify

```bash
pnpm test        # includes 12 intent-parsing cases
pnpm demo:e2e    # parse → real quote → (mocked swap) → REAL testnet claim link;
                 # prints the funding transaction's nearblocks.io link
```

Needs `RELAYER_ACCOUNT_ID`/`RELAYER_PRIVATE_KEY` in `.env` (any funded
testnet account — see `.env.example`). Everything else runs with no keys.
In the browser: `pnpm dev` → `/send` → type "send $5 to mum" → Confirm →
claim link + testnet transaction link.

### LIVE_INTENTS (real mainnet swap)

Off by default. To record one real proof swap: set `LIVE_INTENTS=true` plus
`MAINNET_ACCOUNT_ID`/`MAINNET_PRIVATE_KEY` for a mainnet account holding a
little USDT (the swap is capped at 2 USDT). The send flow then executes a
real 1Click swap and stores its transaction hash in the transfer record.

## How NEAR is used

_Placeholder — will cover: NEAR Intents (1Click) routing, linkdrop claim
links, meta-transactions/relayer for gasless claims, named sub-accounts,
and the receipts contract._

## Roadmap (beyond the features table)

- Cash-out partners
- Virtual card
- Yield on idle balances
- Recurring sends
- Spending rules
