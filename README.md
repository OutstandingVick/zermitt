# Zermitt

**Send money with a sentence.** Zermitt is an AI remittance agent on NEAR: a
sender types "send $50 to mum", the agent routes funds from any asset or chain
into USDC on NEAR via NEAR Intents, and the recipient claims it with a Google
sign-in — no wallet, no gas, no crypto vocabulary.

**The problem:** remittances are slow, fee-heavy, and assume both sides speak
crypto. Zermitt makes the sender side one sentence and the recipient side one
Google login, with a public receipt for every transfer.

**Hackathon tracks:** Payments & Remittances · Privacy & Private AI
(NEAR AI Cloud TEE agent, flagged — see the features table).

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
| Claim links | ✅ created and claimed on testnet |
| Google sign-in | 🧪 mocked login (DEMO_MODE) fully working; real Privy integration deferred — its SDK currently breaks the Next build (see `scripts/spikes/02-social-login.md`) |
| Named sub-accounts (`mum.zermitt.testnet`) | ✅ recipient picks a name; availability checked |
| Gasless claims | ✅ recipient signs nothing on-chain; relayer pays every step (see below) |
| Dollar balance | ✅ `/wallet` — USDC balance + received history with tx links |
| Receipt page | ✅ `/r/[id]` reads from the contract and verifies the hash in the browser |
| On-chain receipt contract | ✅ `receipts.zermitt.testnet` (Rust, near-sdk; wasm committed) |
| Fee comparison | ✅ estimates, source cited below |
| Private agent (NEAR AI Cloud attestation) | 🗺️ code complete behind `AGENT_PROVIDER=nearai`, **not verified against the live service** (no API key was available) — see "Private agent" below |

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

## How the claim works

```
recipient's browser                      server (relayer = zermitt.testnet)
───────────────────                      ──────────────────────────────────
opens /claim/<id>#k=<claimKey>
  → GET /api/claim/<id>  ──────────────▶ claim state (valid/expired/claimed)
signs in (Google via Privy, or mock)
generates ed25519 keypair locally
  → POST name + PUBLIC key + claimKey ─▶ 1. create name.zermitt.testnet
                                            (relayer pays; recipient's key
                                            becomes the full-access key)
                                         2. linkdrop `claim` → sends the
                                            link's NEAR to the new account
                                            (signed with the claim key)
                                         3. storage_deposit on the USDC
                                            contract (relayer pays)
                                         4. ft_transfer USDC → new account
  ◀── account id + 4 tx links
/wallet shows the dollar balance
```

The recipient signs **zero** on-chain transactions, so no NEP-366
meta-transaction is needed: all four steps are ordinary transactions signed
by the relayer (1, 3, 4) or by the one-time linkdrop claim key (2). The
private key generated in the browser never leaves it. Why the relayer
creates the sub-account instead of linkdrop `create_account_and_claim`: the
`testnet` linkdrop contract can only create direct children of `testnet`,
and `name.zermitt.testnet` can only be created by `zermitt.testnet`.

## How to verify

```bash
pnpm test        # 30 tests: parsing, name validation, claim states, decimals
pnpm demo:e2e    # the WHOLE flow: parse → real quote → (mocked swap) →
                 # real testnet claim link → mocked login → named account
                 # created → gasless claim → USDC paid out; prints every
                 # nearblocks.io transaction link and the final balance
```

Needs `RELAYER_ACCOUNT_ID`/`RELAYER_PRIVATE_KEY` in `.env` — a funded
testnet account that owns the parent (`zermitt.testnet` here; sub-account
creation requires the parent's key). Everything else runs with no keys.
In the browser: `pnpm dev` → `/send` → "send $5 to mum" → Confirm → open
the claim link → mocked Google login → pick a name → see `/wallet`.
The test USDC is `usdc.fakes.testnet` (public `mint`; the relayer holds a
minted balance it pays out from).

### Receipts

Every claimed transfer is recorded in the receipts contract at
**`receipts.zermitt.testnet`** with a sha256 hash of its canonical metadata.
Verify one with no keys and no `.env`:

```bash
pnpm verify:receipt 8caa7d85-c220-49e3-bfec-cfb3e43ffbfc   # example receipt
```

or open `/r/<transfer_id>` (example: `/r/8caa7d85-c220-49e3-bfec-cfb3e43ffbfc`)
and press **Verify in this browser** — it reads the receipt from the contract
(not the app database), recomputes the hash from the displayed data, and
compares. Unclaimed transfers show as pending. The contract source is in
`contracts/receipts/` with unit tests; the built wasm is committed at
`contracts/receipts/res/zermitt_receipts.wasm` so judges don't need Rust.

Fee-comparison figures on the receipt page are **estimates** from one config
file (`lib/receipts/comparison.ts`), based on the World Bank's
[Remittance Prices Worldwide](https://remittanceprices.worldbank.org)
global average (~6.2% to send $200) and typical 1–5 business-day bank
settlement.

### Private agent (NEAR AI Cloud) — flagged, off by default

With `AGENT_PROVIDER=nearai` and a `NEARAI_API_KEY` (from cloud.near.ai),
intent parsing runs on NEAR AI Cloud's TEE-hosted models
(`https://cloud-api.near.ai`, OpenAI-compatible). Per request the app
collects: the model ID, the ECDSA response signature over
`sha256(request):sha256(response)` (from `/v1/signature/{chatId}`), and a
fresh attestation report (`/v1/attestation/report`, random 32-byte nonce);
it verifies locally that the hashes match and the signature recovers to the
attested signing key, then commits `agent_provider`, `model`,
`attestation_hash` (sha256 of the report) and `signing_key` into the
on-chain receipt. Old receipts without these fields still verify — absent
fields are skipped in the canonical hash on both sides.

**What is verified:** request/response integrity and the signature against
the attested key. **What is not:** the raw Intel TDX / NVIDIA quotes — that
needs vendor attestation services (see
[nearai/nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier)).
This feature is 🗺️ because it has not been exercised against the live
service (no API key at build time); without the flag, parsing uses
Anthropic or the keyless fallback, and receipts say "standard (not private)".

Receipts are written to **`receipts-v2.zermitt.testnet`** (adds the optional
agent fields); the page and CLI read v2 and fall back to v1
(`receipts.zermitt.testnet`) for older receipts. v2 was deployed fresh
rather than migrating v1 in place: Borsh state layouts are positional, so
an in-place upgrade would have required rewriting every stored receipt,
and keeping v1 immutable means old receipt links stay verifiable forever.

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

- Key recovery through social login
- Cash-out partners
- Virtual card
- Yield on idle balances
- Recurring sends
- Spending rules
