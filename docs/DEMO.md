# Two-minute demo script (52-second pitch + 68-second product walkthrough)

## Before recording (5 min)

Record on the live site, **https://zermitt.vercel.app**: production build,
real Google sign-in, the private agent, and no local server to keep running.

1. Two normal Chrome windows, **no device mode**: at desktop width the app
   shows as a phone (390 × 844 frame) on the blue → lemon gradient. Make each
   window at least 600 px wide and about 900 px tall so the frame is full
   size, and put them side by side. Window A (profile A) is the sender,
   window B (profile B, signed in to the **demo Google account**, not a
   personal one) the recipient. The landing page is not framed; it stays a
   full-width light site.
2. Warm up both windows: open `/`, `/app`, `/send` and a `/r/...` page once.
3. In window A, type **Victor** in the **From** field on `/send` once. It is
   remembered.
4. Send limits on the live site: 5 sends per visitor per hour, 40 per day
   overall. Leave room for the take: don't do more than 3 rehearsal sends
   in the hour before recording.
5. Relayer has about 26 test NEAR; each send plus claim costs about 1.6. The
   name `aunty-grace` is still free; use other names for rehearsals.
6. Scrolling happens inside the phone screen (trackpad over the frame), and
   the bottom bar stays pinned to the phone's bottom edge.
7. Fallback if the live site misbehaves: run locally with
   `pnpm build && DEMO_MODE=false pnpm start -p 3007` and swap
   `https://zermitt.vercel.app` for `http://localhost:3007` below.

## Shot list (live site)

### Part 1 — the pitch (0:00–0:52), window A on the landing page

Speak at a calm, steady pace (about 150 words a minute). Scroll down the
landing page section by section as you go, so the screen follows the story.

| Time | On screen | What to say |
| --- | --- | --- |
| 0:00–0:10 | Hero: "Send dollars home. By typing a sentence." | "Hundreds of millions of people send money home to their families. On a two-hundred-dollar transfer they lose about six percent to fees, and the money can take days to arrive." |
| 0:10–0:19 | Scroll to the 6.2% / 1–5 days / 0 wallets figures | "Crypto solved the speed and the cost years ago. What it never solved is the person on the other end. Ask a grandmother in Lagos for a seed phrase, and the conversation is over." |
| 0:19–0:33 | Scroll to "How a send works" (the ticket) | "Zermitt is an AI remittance agent on NEAR. You type one sentence: send twenty dollars to Aunty Grace. The agent reads it privately, inside a secure enclave, gets a live quote through NEAR Intents, and sends her a link." |
| 0:33–0:42 | Scroll to "For the family" | "She taps the link, signs in with Google, and gets her own named account with the dollars in it. No app. No wallet. No gas. Zermitt pays every fee." |
| 0:42–0:52 | Scroll to "Trust you can check" (the receipt) | "And every transfer leaves a receipt on NEAR that anyone can verify, including proof of which AI model handled the request. It's live on NEAR testnet today. Let me show you." |

### Part 2 — the product (0:52–2:00)

| Time | Window | Action | What to say |
| --- | --- | --- | --- |
| 0:52–0:55 | A | **Get Started** → `/app` (the phone appears on the gradient) → orange send button | "As a sender, I don't even need an account." |
| 0:55–1:03 | A | Type `Send $20 to Aunty Grace` → send button. Agent reply shows chips **Amount · $20**, **To · Aunty Grace**, **Pay with · USDT** | "The agent reads it inside a NEAR AI Cloud enclave." (point at the blue *Read privately in a NEAR AI Cloud TEE* line) |
| 1:03–1:10 | A | **Get a quote** → orange card: You send 20.00 USDT ↓ Aunty Grace gets ~19.99 USDC; rows Fee, Arrives, Gas $0.00 | "Live NEAR Intents quote. Fees in cents, and zero gas for her." |
| 1:10–1:14 | A | **Confirm and send** → "Link ready for Aunty Grace" | "A claim link, ready for WhatsApp or SMS." (point at the lemon *Waiting…* step) |
| 1:14–1:17 | A | **Copy** → paste into window B | |
| 1:17–1:24 | B | Claim page: "Victor sent you $19.99", name field shows `aunty-grace` | "Here's what Grace sees. Just this." |
| 1:24–1:30 | B | **Continue with Google** → demo Google account | "She picks a name and signs in with Google. No seed phrase." |
| 1:30–1:33 | B | **Jump-cut** past the ~1-minute "Claiming…" wait to **It's yours** | |
| 1:33–1:39 | B | Point at the five blue steps (account, link, USDC enabled, USDC sent, receipt) → **See my balance** → `/app` | "Account created, dollars delivered, receipt recorded. Zermitt paid every fee." |
| 1:39–1:54 | B | **Receipts** tab → the row → `/r/<id>`. Badge **Verified on NEAR**, then **Check the TEE signature** → pass, then **Verify in this browser** | "Every transfer has a receipt on NEAR that anyone can recheck, including proof the AI ran privately in a TEE." |
| 1:54–2:00 | B | Scroll to **Versus a bank**, hold | "Cents, not dollars. Seconds, not days. That's Zermitt." |

## Backup: pre-seeded transfers (already claimed)

If a live step stalls, show these instead (they work on the live site) (the TEE check passes from the
committed fixtures on any clone):

- Receipt, Victor → mum: `https://zermitt.vercel.app/r/0153b43a-c452-4c4e-8d3b-8c7e2ef8101b`
- Receipt, Victor → tunde: `https://zermitt.vercel.app/r/2b9f5291-5ed5-40a8-9823-acb6e7611cbf`
- Wallets: `https://zermitt.vercel.app/app?account=mama.zermitt.testnet` ·
  `https://zermitt.vercel.app/app?account=tunde.zermitt.testnet`
