# Landing page claim audit

Every product claim on the landing page is intentionally bounded by the repository README. Illustrative story cards are labeled `Example`; the people in the photographs are not presented as customers.

| Landing-page claim | README support |
| --- | --- |
| “An AI agent sends it.” | The solution describes the agent parsing a sentence, showing a quote, and the sender confirming the transfer. |
| Family claims with Google | Solution and Features: Google identity via Privy when configured; simulated login in demo mode. |
| Every transfer has a receipt on NEAR | Solution, Receipts, and Features: claimed transfers are recorded by the receipt contract; alternate relayers may skip receipt recording as documented in setup. |
| Testnet demo | Status and Known issues explicitly describe the testnet flow and test USDC. |
| Real quote, mocked swap execution | Status: real mainnet pricing; execution simulated in demo mode because Intents has no testnet. |
| World Bank average cost of about 6.2% to send $200 | Problem and Receipts cite Remittance Prices Worldwide and label this as an estimate. |
| Traditional transfers often settle in 1–5 business days | Receipts cites a typical 1–5 business-day bank settlement estimate. |
| Quote shows route, fee, and estimated arrival before confirmation | Sender solution and Features list amount, fee, rate, and time before confirmation. |
| WhatsApp claim link | Claim links feature says links are shareable via WhatsApp/SMS. |
| Google sign-in is identity-only | Features explicitly describes Privy as identity only. |
| Named account such as `grace.zermitt.testnet` | Solution and Features document recipient-chosen `name.zermitt.testnet` accounts. |
| Recipient receives test USDC | Architecture, NEAR usage, and Known issues specify `usdc.fakes.testnet`. |
| Recipient signs no on-chain transaction; relayer pays | Architecture, Solution, and NEAR usage describe all claim steps as relayer-paid. |
| Receipt is recorded on NEAR | Receipts and Features describe the on-chain receipt contract and hash verification. |
| Agent can run in a secure enclave with proof of model | Private agent section: when `NEARAI_API_KEY` is configured, parsing runs in NEAR AI Cloud's TEE, and the model/proof fields are committed. The landing copy preserves this configuration condition. |
| `pnpm verify:receipt …` | How to verify documents the exact command and committed receipt ID. |
| Intents supports USDT or NEAR on NEAR into USDC | Routing scope and Features state exactly these two input assets, this origin chain, and USDC output. |
| Linkdrop claim links | How NEAR is used: NEP-452 linkdrops fund a claim key carried in the link. |
| NEAR AI Cloud private parsing | How NEAR is used and Private agent describe attested TEE parsing. |
| Cash-out, mobile money, virtual card, recurring sends, and key recovery | Roadmap only. The landing page labels all four as roadmap and the footer reiterates that cash-out and card are not available now. |

## Deliberate non-claims

- The page does not claim support for arbitrary assets or chains.
- The page does not claim production or mainnet execution.
- The page does not claim cash-out, mobile-money delivery, a card, recurring transfers, or key recovery are available.
- The page contains no testimonials, customer counts, transfer-volume statistics, or invented performance figures.
