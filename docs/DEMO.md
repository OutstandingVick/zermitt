# 75-second demo script

## Before recording (5 min)

1. Real Google login: run with `DEMO_MODE=false` (Privy app ID in `.env`),
   on a port listed in Privy's allowed domains (currently 3000 and 3120):
   `DEMO_MODE=false pnpm dev -p 3120`.
   Simulated login instead: plain `pnpm dev`.
2. Two Chrome profiles at phone size (DevTools device mode, 390 × 844):
   profile A is the sender, profile B the recipient. Sign in to B with the
   **demo Google account** (not a personal one).
3. Warm up: open `/`, `/send`, `/wallet` and a `/r/...` page once. The first
   compile in dev mode is slow.
4. In profile A, type **Victor** in the **From** field on `/send` once. It is
   remembered.
5. Relayer has 30+ NEAR. Each send plus claim costs about 1.6 NEAR. The name
   `aunty-grace` is still free; pick another if you do a test run first.

## Shot list (URLs on port 3120)

| Time | Window | Action | What to say |
| --- | --- | --- | --- |
| 0:00–0:07 | A | `http://localhost:3120/` (light landing) | "Sending $200 home costs about 6% and takes days. Zermitt: one sentence." |
| 0:07–0:10 | A | **Get Started** → `/send` (dark app, "New send") | |
| 0:10–0:18 | A | Type `Send $20 to Aunty Grace` → send button. Agent reply shows chips **Amount · $20**, **To · Aunty Grace**, **Pay with · USDT** | "A private AI agent reads it, inside a NEAR AI Cloud enclave." (point at the blue *Read privately in a NEAR AI Cloud TEE* line) |
| 0:18–0:25 | A | **Get a quote** → orange card: You send 20.00 USDT ↓ Aunty Grace gets ~19.99 USDC; rows Fee, Arrives, Gas $0.00 | "Live NEAR Intents quote. Fees in cents, and zero gas for her." |
| 0:25–0:29 | A | **Confirm and send** → "Link ready for Aunty Grace" | "A claim link, ready for WhatsApp or SMS. She's waiting to claim." (lemon *Waiting…* step) |
| 0:29–0:32 | A | **Copy** → paste into window B | |
| 0:32–0:39 | B | Claim page: "Victor sent you $19.99", name field shows `aunty-grace` | "Grace has no wallet. Just this." |
| 0:39–0:45 | B | **Continue with Google** → demo Google account | "She picks a name and signs in with Google. No seed phrase." |
| 0:45–0:48 | B | **Jump-cut** past the ~1-minute "Claiming…" wait to **It's yours** | |
| 0:48–0:54 | B | Point at the five blue steps (account, link, USDC enabled, USDC sent, receipt) → **See my balance** → `/wallet` | "Account created, dollars delivered, receipt recorded. Zermitt paid every fee." |
| 0:54–1:09 | B | **Receipts** tab → the row → `/r/<id>`. Badge **Verified on NEAR**, then **Check the TEE signature** → pass, then **Verify in this browser** | "Every transfer has a receipt on NEAR that anyone can recheck, including proof the AI ran privately in a TEE." |
| 1:09–1:15 | B | Scroll to **Versus a bank**, hold | "Cents, not dollars. Seconds, not days. Zermitt." |

## Backup: pre-seeded transfers (already claimed)

If a live step stalls, show these instead (the TEE check passes from the
committed fixtures on any clone):

- Receipt, Victor → mum: `http://localhost:3120/r/0153b43a-c452-4c4e-8d3b-8c7e2ef8101b`
- Receipt, Victor → tunde: `http://localhost:3120/r/2b9f5291-5ed5-40a8-9823-acb6e7611cbf`
- Wallets: `http://localhost:3120/wallet?account=mama.zermitt.testnet` ·
  `http://localhost:3120/wallet?account=tunde.zermitt.testnet`
