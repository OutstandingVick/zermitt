import Image from "next/image";
import Link from "next/link";
import { DollarPlane, HeartPhone, MoneyCurrent, ReceiptSmile } from "./landing-art";

const receiptHref = "/r/2b9f5291-5ed5-40a8-9823-acb6e7611cbf";

export default function Home() {
  return (
    <main id="main-content" className="landing">
      <section className="landing-section hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">SEND HOME · WITHOUT THE CRYPTO HOMEWORK</p>
          <h1 id="hero-title" className="mega-title">Send dollars <em className="highlight">home</em> by typing a sentence.</h1>
          <p className="hero-lead">An AI agent sends it. Your family claims it with Google. Every transfer has a receipt on NEAR.</p>
          <div className="action-row">
            <Link href="/send" className="landing-button landing-button-primary">Try the demo <span aria-hidden="true">↗</span></Link>
            <Link href={receiptHref} className="landing-button landing-button-secondary">See a real receipt</Link>
          </div>
          <p className="demo-note"><span aria-hidden="true">●</span> Testnet demo · real quote, mocked swap execution</p>
        </div>
        <div className="hero-visual" aria-label="Victor sees a transfer confirmation on his phone">
          <div className="hero-blob" aria-hidden="true" />
          <Image className="hero-photo" src="/landing/hero-man-phone.jpg" alt="A smiling Nigerian man looking at his phone" width={900} height={1100} priority sizes="(max-width: 800px) 92vw, 42vw" />
          <div className="phone-card">
            <span className="phone-notch" aria-hidden="true" />
            <span className="phone-check" aria-hidden="true">✓</span>
            <small>SENT</small>
            <strong>Victor sent you $40</strong>
            <span>Claim with Google</span>
          </div>
          <span className="sticker sticker-gas">NO GAS</span>
          <span className="sticker sticker-receipt">RECEIPT ON NEAR</span>
        </div>
        <MoneyCurrent className="hero-current" />
      </section>

      <section className="landing-section problem" aria-labelledby="problem-title">
        <div className="section-heading">
          <p className="eyebrow">THE OLD WAY ASKS TOO MUCH</p>
          <h2 id="problem-title" className="section-title">Sending $50 home shouldn&apos;t cost $5 or take <em>days</em>.</h2>
        </div>
        <div className="problem-photo-wrap">
          <Image className="section-photo problem-photo" src="/landing/mum-video-call.jpg" alt="A smiling African woman on a video call at home" width={1200} height={900} sizes="(max-width: 800px) 100vw, 52vw" />
          <div className="photo-note"><strong>Mama, check your WhatsApp 💛</strong><span>A link is easier than a wallet.</span></div>
        </div>
        <div className="problem-cards">
          <article className="problem-card mango-card"><span className="mono-index">01 · FEES</span><strong>Too much disappears on the way.</strong><p>The World Bank estimates an average cost of about 6.2% to send $200.</p></article>
          <article className="problem-card lilac-card"><span className="mono-index">02 · TIME</span><strong>Days is too long when family needs it now.</strong><p>Traditional transfers often settle in 1–5 business days.</p></article>
          <article className="problem-card teal-card"><span className="mono-index">03 · CRYPTO</span><strong>A seed phrase is not a family welcome.</strong><p>Wallets and gas put the hardest step on the person receiving.</p></article>
        </div>
        <p className="source-note">Estimates: World Bank, <cite>Remittance Prices Worldwide</cite>. Costs vary by route and provider.</p>
      </section>

      <section className="landing-section how" aria-labelledby="how-title">
        <div className="section-heading how-heading"><p className="eyebrow">THREE SMALL STEPS</p><h2 id="how-title" className="section-title">Type it. Send it. They <em>claim</em> it.</h2></div>
        <ol className="how-grid">
          <li className="how-card"><span className="step-pill">STEP 01 · TYPE</span><h3>Say it naturally.</h3><p>“Send $40 to Mum for groceries.”</p><div className="mini-chat"><span>Send $40 to Mum</span><i aria-hidden="true">↗</i></div></li>
          <li className="how-card"><span className="step-pill">STEP 02 · SEND</span><h3>Check the quote.</h3><p>See the route, fee and estimated arrival before you confirm.</p><div className="mini-quote"><small>YOU SEND</small><strong>40.00 USDT</strong><span>→ 39.76 USDC</span></div></li>
          <li className="how-card"><span className="step-pill">STEP 03 · CLAIM</span><h3>Share one link.</h3><p>They open WhatsApp, sign in with Google and choose a name.</p><div className="mini-whatsapp"><span aria-hidden="true">♥</span><strong>Mama, your $40 is ready.</strong><small>Claim with Zermitt →</small></div></li>
        </ol>
        <div className="examples" aria-label="Illustrative examples">
          <article><span>EXAMPLE</span><p>Tunde sends $40 to his mum for groceries every month.</p></article>
          <article><span>EXAMPLE</span><p>Ada sends NEAR; Aunty receives test USDC in her named account.</p></article>
          <article><span>EXAMPLE</span><p>Victor shares a claim link, then checks the receipt on NEAR.</p></article>
        </div>
        <DollarPlane className="how-plane" />
      </section>

      <section className="landing-section family" aria-labelledby="family-title">
        <div className="family-photo-wrap">
          <Image className="section-photo family-photo" src="/landing/mum-message.jpg" alt="A mother smiling as she reads a message on her phone" width={1400} height={1000} sizes="(max-width: 800px) 100vw, 58vw" />
          <span className="sticker family-sticker">NO SEED PHRASE</span>
        </div>
        <div className="family-copy">
          <p className="eyebrow">FOR THE FAMILY</p>
          <h2 id="family-title" className="family-title">No app.<br />No seed phrase.<br />No <em>gas</em>.</h2>
          <p className="family-lead">She doesn&apos;t need to know what a blockchain is.</p>
          <ol className="claim-steps">
            <li><span>01</span><div><strong>A WhatsApp link</strong><small>Open it. Nothing to install.</small></div></li>
            <li><span>02</span><div><strong>Google sign-in</strong><small>Familiar, quick and identity-only.</small></div></li>
            <li><span>03</span><div><strong>Her own named account</strong><small><code>grace.zermitt.testnet</code></small></div></li>
            <li><span>04</span><div><strong>Test USDC lands there</strong><small>Zermitt&apos;s relayer pays the gas.</small></div></li>
          </ol>
          <HeartPhone className="family-art" />
        </div>
        <div className="aunties-pair">
          <Image className="section-photo" src="/landing/aunties-laughing.jpg" alt="Family members laughing together at home" width={1000} height={1000} sizes="(max-width: 800px) 100vw, 40vw" />
          <div><span className="mono-index">A LITTLE EASIER</span><strong>For Mama.<br />For Aunty.<br />For home.</strong></div>
        </div>
      </section>

      <section className="landing-section trust-section" aria-labelledby="trust-title">
        <div className="trust-copy">
          <p className="eyebrow">TRUST YOU CAN CHECK</p>
          <h2 id="trust-title" className="section-title">A receipt that does more than say <em>“trust us.”</em></h2>
          <p>Each claimed transfer is recorded on NEAR. When NEAR AI Cloud is configured, the agent runs in a secure enclave and the receipt carries proof of which model ran.</p>
          <div className="trust-badges"><span>✅ Verified on NEAR</span><span>🔒 Ran privately in a TEE</span></div>
          <div className="verify-snippet"><span>VERIFY IT YOURSELF</span><code>pnpm verify:receipt 2b9f5291-5ed5-40a8-9823-acb6e7611cbf</code></div>
        </div>
        <article className="receipt-card" aria-label="Example verified transfer receipt">
          <div className="receipt-top"><ReceiptSmile className="receipt-art" /><div><small>ZERMITT RECEIPT</small><strong>Victor → Tunde</strong></div></div>
          <dl><div><dt>REQUEST</dt><dd>send $40 to tunde</dd></div><div><dt>ROUTE</dt><dd>USDT → USDC</dd></div><div><dt>FEE</dt><dd>quote estimate</dd></div><div><dt>TX</dt><dd>8AN4…eK2q</dd></div><div><dt>ATTESTATION</dt><dd>Qwen3-VL · matched</dd></div></dl>
          <Link href={receiptHref}>Open the real receipt <span aria-hidden="true">↗</span></Link>
        </article>
      </section>

      <section className="landing-section built" aria-labelledby="built-title">
        <div className="built-heading"><div><p className="eyebrow">THE NEAR PART</p><h2 id="built-title" className="section-title">Built on rails that stay <em>out of the way.</em></h2></div><p>Serious infrastructure, explained in plain words.</p></div>
        <div className="near-grid">
          <article><span>01</span><h3>NEAR Intents</h3><p>Live 1Click quotes for USDT or NEAR on NEAR into USDC.</p></article>
          <article><span>02</span><h3>Named accounts</h3><p>Human names like <code>grace.zermitt.testnet</code>.</p></article>
          <article><span>03</span><h3>Linkdrop claims</h3><p>A shareable link carries the one-time claim key.</p></article>
          <article><span>04</span><h3>Gasless delivery</h3><p>The recipient signs no on-chain transaction. The relayer pays.</p></article>
          <article><span>05</span><h3>NEAR AI Cloud</h3><p>Private parsing in a TEE, with proof attached to the receipt.</p></article>
        </div>
        <div className="honest-note"><strong>Testnet demo</strong><span>Swap execution mocked because Intents has no testnet. Quotes use real mainnet pricing.</span></div>
        <div className="roadmap"><span>ROADMAP</span><ul><li>Cash-out to bank + mobile money</li><li>Virtual card</li><li>Recurring sends</li><li>Key recovery</li></ul></div>
      </section>

      <section className="cta" aria-labelledby="cta-title">
        <Image src="/landing/family-together.jpg" alt="A family enjoying time together at home" fill sizes="100vw" className="cta-photo" />
        <div className="cta-shade" aria-hidden="true" />
        <div className="cta-content"><p className="eyebrow">ONE SENTENCE CLOSER</p><h2 id="cta-title">Money home, by <em>sentence</em>.</h2><p>Try the testnet flow. No keys or environment file needed for a quote.</p><div className="action-row"><Link href="/send" className="landing-button landing-button-primary">Try the demo <span aria-hidden="true">↗</span></Link><a href="https://github.com/OutstandingVick/zermitt" className="landing-button landing-button-secondary">View on GitHub</a></div></div>
      </section>

      <footer className="landing-footer">
        <Link href="/" className="footer-brand">Zermitt<span>.</span></Link>
        <p>Built at <strong>#NEARHackathon</strong></p>
        <nav aria-label="Footer"><a href="https://github.com/OutstandingVick/zermitt">GitHub</a><a href="https://x.com/zermitt_cash">X · @zermitt_cash</a><Link href="/send">Demo</Link><a href="https://github.com/OutstandingVick/zermitt/blob/main/docs/IMAGE_CREDITS.md">Image credits</a></nav>
        <small>Testnet money only. Cash-out and card are on the roadmap.</small>
      </footer>
    </main>
  );
}
