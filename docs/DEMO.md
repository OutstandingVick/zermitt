# 75-second demo script

## Before recording (5 min)

1. Real Google login: run with `DEMO_MODE=false` (Privy app ID in `.env`),
   on a port listed in Privy's allowed domains (currently 3000 and 3120):
   `DEMO_MODE=false pnpm dev -p 3120`.
   Simulated login instead: plain `pnpm dev`.
2. Sign in to Chrome profile B with the **demo Google account** (not a
   personal one). Profile A is the sender, profile B the recipient.
3. Warm up: open `/`, `/send`, `/wallet` and a `/r/...` page once. The first
   compile in dev mode is slow.
4. Relayer has 30+ NEAR. Each send plus claim costs about 1.6 NEAR.

## Shot list (URLs on port 3120)

| Time | Window | Action | What to say |
| --- | --- | --- | --- |
| 0:00–0:08 | A | `http://localhost:3120/` | "Sending $200 home costs about 6% and takes days. Zermitt: one sentence." |
| 0:08–0:12 | A | Click **Send money** | |
| 0:12–0:22 | A | Name shows **Victor**. Type `send $20 to aunty grace` → **Go** | "A private AI agent reads it. Here's a live NEAR Intents quote: fee, rate, time." |
| 0:22–0:28 | A | **Confirm and send $20** → success screen | "A claim link, ready for WhatsApp or SMS." |
| 0:28–0:31 | A | **Copy link** → paste into window B | |
| 0:31–0:38 | B | Claim page: "Victor sent you $19.98" | "Grace has no wallet. Just this." |
| 0:38–0:44 | B | **Continue with Google** → demo Google account | "Google sign-in. No seed phrase." |
| 0:44–0:48 | B | Name shows `aunty-grace` → **Claim my money** | "She picks a name. Zermitt pays every fee." |
| 0:48–0:52 | B | **Jump-cut** past the ~1-minute wait to the **Claimed** card | |
| 0:52–0:58 | B | Point at the 5 ✅ steps → **See my balance** → `/wallet` | "Account created, USDC delivered, receipt recorded." |
| 0:58–1:10 | B | Back → **View receipt on NEAR** → `/r/<id>` → **Verify in this browser** ✅ → **Check response signature** ✅ | "Every transfer has a receipt on NEAR that anyone can verify, including proof the AI ran privately in a TEE." |
| 1:10–1:15 | B | Hold on the receipt | "Zermitt. Send money home with one sentence." |

## Backup: pre-seeded transfers (already claimed)

If a live step stalls, show these instead:

- Receipt, Victor → mum: `http://localhost:3120/r/0153b43a-c452-4c4e-8d3b-8c7e2ef8101b`
- Receipt, Victor → tunde: `http://localhost:3120/r/2b9f5291-5ed5-40a8-9823-acb6e7611cbf`
- Wallets: `http://localhost:3120/wallet?account=mama.zermitt.testnet` ·
  `http://localhost:3120/wallet?account=tunde.zermitt.testnet`
