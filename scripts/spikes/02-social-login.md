# Spike 2 — Google/social login on NEAR (findings, 2026-11-12)

## What's current

- **FastAuth is deprecated.** NEAR's docs mark it deprecated; the successor
  ("NEAR Auth", MPC + Auth0) was still in development at research time and is
  not something to bet a hackathon on.
- **The official docs' social-login tutorial
  (https://docs.near.org/web3-apps/tutorials/social-login) presents Privy as
  the main option**, two ways:
  1. **Privy via NEAR Connect** (`@peerfolio/privy-near-connect`): social login
     plus interop with any NEAR Connect wallet. The docs example targets
     **testnet** (`network: 'testnet'`).
  2. **Privy directly** (`@privy-io/react-auth`): pure Web2-style login (email,
     Google, GitHub); the app builds a near-api-js `Account` with a custom
     signer over Privy's `signRawHash`.
  **Web3Auth** is listed as an alternative (Modal or MPC Core Kit).

## Decision

**Privy directly** for Zermitt:
- Google login with the wallet fully hidden — matches "recipient signs in with
  Google" with zero crypto vocabulary.
- Works on testnet.
- No extra manifest/sign-route plumbing that NEAR Connect needs; Zermitt
  doesn't need other-wallet interop for the recipient flow.

## What Phase 0 ships

- `app/spike-login/page.tsx`: a **mocked** Google login (the DEMO_MODE
  default) showing the exact shape the real flow produces: email identity →
  named sub-account (`<alias>.zermitt.testnet`).
- The real Privy integration needs a Privy App ID (free at
  https://dashboard.privy.io) — env vars `NEXT_PUBLIC_PRIVY_APP_ID` are
  documented in `.env.example`. Wiring the real popup is Phase 2 work and
  deliberately not claimed in the README yet.

## Steps for the real integration (Phase 2)

1. Create a Privy app (dashboard.privy.io); enable Google as a login method.
2. `pnpm add @privy-io/react-auth @noble/curves` (near-api-js already present).
3. Wrap the app in `PrivyProvider` with the App ID.
4. On login, create/fetch the user's NEAR key via Privy's embedded wallet
   (`signRawHash`) and map their email to a `*.zermitt.testnet` sub-account.
5. Fund account creation through the relayer (meta-transactions) so the
   recipient never pays gas.

## Phase 2 update (2026-11-12)

Attempted the real integration: `@privy-io/react-auth@3.51.3` breaks the
Next 15 build out of the box — its Solana peer-dependency tree resolves
`@solana-program/system@0.14.1` against `@solana/kit@5.5.1`, which doesn't
export `./program-client-core` ("Module not found" at compile time). Rather
than ship a repo that fails a clean `pnpm dev` (instant judging failure),
the dependency was removed. The claim flow needs only an email from the
login component, so the integration surface is a single component
(`RealGoogleLogin` in `app/claim/[id]/page.tsx`). Options when revisiting:
pin the Solana packages via pnpm overrides, or use Privy's lower-level
`@privy-io/js-sdk-core`.

Identity model (implemented): Privy-or-mock supplies only the identity; the
browser generates a fresh ed25519 keypair at claim time, the public key
becomes the new account's full-access key, and the private key stays in
localStorage linked to the identity. Recovery is on the roadmap.

## Risks

- Privy embedded-wallet signing for NEAR relies on raw-hash signing; the docs
  tutorial demonstrates it working with near-api-js, but the custom-signer code
  must be lifted carefully from the tutorial.
- Mock-vs-real divergence: keep the mock producing the same `{email,
  nearAccountId}` shape the real flow emits so swapping is mechanical.
