# 75-second demo script

## Before recording (5 min)

1. Run a production build for the recording: no Next "N" dev badge and no
   slow first-compile pauses. Stop any `pnpm dev` on 3007 first (both use `.next`).
   - Real Google login (add `http://localhost:3007` to Privy's allowed
     domains first; only 3000 and 3120 are allowed so far):
     `pnpm build && DEMO_MODE=false pnpm start -p 3007`
   - Simulated login: `pnpm build && pnpm start -p 3007`
2. Two normal Chrome windows, **no device mode**: at desktop width the app
   shows as a phone (390 × 844 frame) on the blue → lemon gradient. Make each
   window at least 600 px wide and about 900 px tall so the frame is full
   size, and put them side by side. Window A (profile A) is the sender,
   window B (profile B, signed in to the **demo Google account**, not a
   personal one) the recipient. The landing page is not framed; it stays a
   full-width light site.
3. Warm up: open `/`, `/app`, `/send` and a `/r/...` page once in each window.
4. In window A, type **Victor** in the **From** field on `/send` once. It is
   remembered.
5. Relayer has 30+ NEAR. Each send plus claim costs about 1.6 NEAR. The name
   `aunty-grace` is still free; pick another if you do a test run first.
6. Scrolling happens inside the phone screen (trackpad over the frame), and
   the bottom bar stays pinned to the phone's bottom edge.

## Shot list (URLs on port 3007)

| Time | Window | Action | What to say |
| --- | --- | --- | --- |
| 0:00–0:07 | A | `http://localhost:3007/` (light landing, full width) | "Sending $200 home costs about 6% and takes days. Zermitt: one sentence." |
| 0:07–0:10 | A | **Get Started** → `/app` (the phone appears on the gradient) → orange send button → "New send" | "Here's the app." |
| 0:10–0:18 | A | Type `Send $20 to Aunty Grace` → send button. Agent reply shows chips **Amount · $20**, **To · Aunty Grace**, **Pay with · USDT** | "A private AI agent reads it, inside a NEAR AI Cloud enclave." (point at the blue *Read privately in a NEAR AI Cloud TEE* line) |
| 0:18–0:25 | A | **Get a quote** → orange card: You send 20.00 USDT ↓ Aunty Grace gets ~19.99 USDC; rows Fee, Arrives, Gas $0.00 | "Live NEAR Intents quote. Fees in cents, and zero gas for her." |
| 0:25–0:29 | A | **Confirm and send** → "Link ready for Aunty Grace" | "A claim link, ready for WhatsApp or SMS. She's waiting to claim." (lemon *Waiting…* step) |
| 0:29–0:32 | A | **Copy** → paste into window B | |
| 0:32–0:39 | B | Claim page: "Victor sent you $19.99", name field shows `aunty-grace` | "Grace has no wallet. Just this." |
| 0:39–0:45 | B | **Continue with Google** → demo Google account | "She picks a name and signs in with Google. No seed phrase." |
| 0:45–0:48 | B | **Jump-cut** past the ~1-minute "Claiming…" wait to **It's yours** | |
| 0:48–0:54 | B | Point at the five blue steps (account, link, USDC enabled, USDC sent, receipt) → **See my balance** → `/app` | "Account created, dollars delivered, receipt recorded. Zermitt paid every fee." |
| 0:54–1:09 | B | **Receipts** tab → the row → `/r/<id>`. Badge **Verified on NEAR**, then **Check the TEE signature** → pass, then **Verify in this browser** | "Every transfer has a receipt on NEAR that anyone can recheck, including proof the AI ran privately in a TEE." |
| 1:09–1:15 | B | Scroll to **Versus a bank**, hold | "Cents, not dollars. Seconds, not days. Zermitt." |

## Backup: pre-seeded transfers (already claimed)

If a live step stalls, show these instead (the TEE check passes from the
committed fixtures on any clone):

- Receipt, Victor → mum: `http://localhost:3007/r/0153b43a-c452-4c4e-8d3b-8c7e2ef8101b`
- Receipt, Victor → tunde: `http://localhost:3007/r/2b9f5291-5ed5-40a8-9823-acb6e7611cbf`
- Wallets: `http://localhost:3007/app?account=mama.zermitt.testnet` ·
  `http://localhost:3007/app?account=tunde.zermitt.testnet`
