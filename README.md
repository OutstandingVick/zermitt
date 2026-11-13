# Zermitt

**Send money with a sentence.** Zermitt is an AI remittance agent on NEAR: a
sender types "send $50 to mum", the agent routes funds from any asset or chain
into USDC on NEAR via NEAR Intents, and the recipient claims it with a Google
sign-in — no wallet, no gas, no crypto vocabulary.

**The problem:** remittances are slow, fee-heavy, and assume both sides speak
crypto. Zermitt makes the sender side one sentence and the recipient side one
Google login, with a public receipt for every transfer.

**Hackathon tracks:** Payments & Remittances · Privacy & Private AI
(NEAR AI Cloud TEE agent with attested, signed parses — see below).

> **Status:** send → claim → USDC payout → on-chain receipt works end to end
> on testnet. The Intents swap execution is **mocked in DEMO_MODE** (Intents
> has no testnet) and clearly labeled; quotes are real mainnet pricing.
> Google login is mocked. The features table below is exact.

## Quick start

```bash
pnpm install
cp .env.example .env   # DEMO_MODE=true needs no secrets
pnpm dev               # http://localhost:3000
```

Other commands:

```bash
pnpm test              # vitest: parsing, names, claim states, receipt hashing
pnpm demo:e2e          # full flow on testnet (needs RELAYER_* in .env)
pnpm verify:receipt <transfer_id>   # keyless on-chain receipt check
pnpm spike:intents     # real 1Click dry quote → USDC on NEAR (no funds needed)
pnpm spike:claim       # testnet claim link: fund + claim (needs RELAYER_* in .env)
```

## Features

| Feature | Status |
| --- | --- |
| Chat-to-send ("send $50 to mum") | ✅ (private LLM with NEARAI_API_KEY, Anthropic with ANTHROPIC_API_KEY, deterministic fallback with no keys) |
| Any-asset routing (NEAR Intents) | ✅ live quotes · 🧪 execution mocked in DEMO_MODE (`LIVE_INTENTS=true` for a real mainnet swap) |
| Quote and confirm before sending | ✅ |
| Claim links | ✅ created and claimed on testnet |
| Google sign-in | ✅ Privy, identity only, used when `DEMO_MODE=false` and `NEXT_PUBLIC_PRIVY_APP_ID` are set (mocked in demo mode, so judges need no account) |
| Named sub-accounts (`mum.zermitt.testnet`) | ✅ recipient picks a name; availability checked |
| Gasless claims | ✅ recipient signs nothing on-chain; relayer pays every step (see below) |
| Dollar balance | ✅ `/wallet` — USDC balance + received history with tx links |
| Receipt page | ✅ `/r/[id]` reads from the contract and verifies the hash in the browser |
| On-chain receipt contract | ✅ `receipts-v2.zermitt.testnet` (v1 `receipts.zermitt.testnet` still read for older receipts; Rust, near-sdk; wasm committed) |
| Fee comparison | ✅ estimates, source cited below |
| Private agent (NEAR AI Cloud attestation) | ✅ with `NEARAI_API_KEY`: parse runs in a TEE, response signature verified against the attested key, proof committed to the receipt. Full TDX/NVIDIA quote verification is not done here — see "Private agent" below |

## Spike findings (Phase 0)

1. **NEAR Intents has no testnet.** Official docs recommend small mainnet
   swaps. `pnpm spike:intents` fetches a real mainnet **dry quote**
   (free, read-only) for USDT → USDC on NEAR. Executing swaps needs a funded
   mainnet account (Phase 1 decision).
2. **Social login:** FastAuth is deprecated. Chosen: **Privy** (per the
   official NEAR social-login tutorial), with a mocked Google path in
   DEMO_MODE so judges need no accounts. Privy is used for identity only:
   the NEAR key is still generated in the browser and every on-chain step
   is relayer-signed. To use real Google login, set `DEMO_MODE=false`
   and `NEXT_PUBLIC_PRIVY_APP_ID`, enable Google in the Privy dashboard,
   and add your app's origin to Privy's allowed domains. Privy's React SDK
   needs `@solana/kit` pinned to `^8` (set in `pnpm-workspace.yaml`).
   Details: [scripts/spikes/02-social-login.md](scripts/spikes/02-social-login.md).
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

Every claimed transfer is recorded in the receipts contract
(**`receipts-v2.zermitt.testnet`**; older ones on `receipts.zermitt.testnet`)
with a sha256 hash of its canonical metadata. Verify one with no keys and no
`.env`:

```bash
pnpm verify:receipt 8caa7d85-c220-49e3-bfec-cfb3e43ffbfc   # standard receipt
```

A receipt whose parse ran privately in a TEE (works on a fresh clone too):

```bash
pnpm verify:receipt 871eef42-428c-4552-8f28-0a9d9ad5fe51
```

Expected output (abridged):

```
✅ Verified — the on-chain data matches its hash.

🔒 Private agent: model z-ai/glm-5.3-flash, TEE signing key 0x3b753b4406613c5e70ae640508632b600424fa0c
   attestation hash 84a86e5dad6f92c202692b4e3a88e278a8c072414ab9d97658888097ab519d21
   TEE bundle source: fixtures/tee/871eef42-428c-4552-8f28-0a9d9ad5fe51.json
   ✅ signature recovers to signing key
   ✅ request/response hashes match signed text
   ✅ attestation bound to request nonce
   ✅ sha256(report) = on-chain attestation_hash
   ✅ signing key and model = on-chain fields
✅ TEE proof verified (raw TDX/NVIDIA quotes not checked — needs vendor attestation services).
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

### Private agent (NEAR AI Cloud)

With a `NEARAI_API_KEY` (from cloud.near.ai; `AGENT_PROVIDER` defaults to
`nearai` when it's set), intent parsing runs on NEAR AI Cloud's TEE-hosted
model **`Qwen/Qwen3-VL-30B-A3B-Instruct`**, capped at 100 output tokens
(`https://cloud-api.near.ai`, OpenAI-compatible). It is the cheapest model
per parse (about $0.00003) among those whose `/v1/attestation/report`
returns Intel TDX + NVIDIA evidence bound to a signing address. Proxied
models (OpenAI, Anthropic, Google, and OpenRouter-routed ones) return 503
from that endpoint and can't be attested. `z-ai/glm-5.3-flash` has a lower
list price, but it always reasons first, so it costs more per parse and its
answer got cut off in about 1 of 5 runs at the 100-token cap. The two
committed example receipts were made with it. Override with `NEARAI_MODEL`.
Per request the app
collects: the model ID, the ECDSA response signature over
`sha256(request):sha256(response)` (from `/v1/signature/{chatId}`), and a
fresh attestation report (`/v1/attestation/report`, random 32-byte nonce);
it verifies locally that the hashes match, the signature recovers to the
signing address in the attestation, and the attestation echoes our nonce,
then commits `agent_provider`, `model`,
`attestation_hash` (sha256 of the report) and `signing_key` into the
on-chain receipt. Old receipts without these fields still verify — absent
fields are skipped in the canonical hash on both sides.

**What is verified:** request/response integrity, the ECDSA signature against
the attested signing key, and attestation freshness (nonce). Anyone can also
check, with no keys, that the model, attestation hash and signing key on a
receipt are covered by its on-chain hash (`pnpm verify:receipt`). The
signature bundle (signed text, signature, nonce, raw attestation report) is
stored by the instance that made the transfer. Bundles for two demo receipts
are committed in `fixtures/tee/`, so on a fresh clone both
`pnpm verify:receipt` and the receipt page's **Check response signature**
button fall back to them. Either way the check is done against the on-chain
receipt: signature recovery, nonce binding,
`sha256(report) == attestation_hash`, and signing key/model == on-chain
fields. Other receipts made on another instance have no bundle on a fresh
clone; their on-chain hash still verifies.
**What is not verified:** the raw Intel TDX / NVIDIA quotes inside the
report. That needs vendor attestation services (see
[nearai/nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier)).
With no `NEARAI_API_KEY`, parsing uses Anthropic or the keyless fallback, and
receipts say "Agent: standard (not private)".

Example private-agent receipts (bundles committed):
`/r/3fc41121-e293-4387-a95c-9e76fef5f72c` and
`/r/871eef42-428c-4552-8f28-0a9d9ad5fe51`.

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
