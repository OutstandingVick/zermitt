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
    </main>
  );
}
