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
    </main>
  );
}
