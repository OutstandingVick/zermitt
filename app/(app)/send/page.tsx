"use client";

/**
 * Send flow in three steps on one route (designs: send.html → quote.html →
 * shared.html). Same API calls as before: POST /api/send/quote parses the
 * sentence and returns a live 1Click quote; POST /api/send/confirm funds the
 * claim link. On testnet the swap step is simulated and labelled as such.
 */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AppShell, Button, Chip, Icon, Label, Row, StatusDot, TopBar, titleCase } from "../ui";

type Intent = { amount: number; asset: string; recipient: string };
type Quote = { amountInFormatted: string; amountOutFormatted: string; feeUsd: number; rate: number; timeEstimateSec: number };
type SendSuccess = { claimLink: string; linkFundTxUrl: string; swapExecution: string; swapNote: string; transferId: string };
type Step = "chat" | "quote" | "shared";

const EXAMPLES = ["Send $40 to Mum", "Send $20 to Aunty Grace", "Pay 15 USDC to Tunde"];

export default function SendPage() {
  const [step, setStep] = useState<Step>("chat");
  const [senderName, setSenderName] = useState("");
  const [draft, setDraft] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [agentProof, setAgentProof] = useState<unknown>(null);
  const [success, setSuccess] = useState<SendSuccess | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setSenderName(localStorage.getItem("zermitt:senderName") ?? "");
    } catch {}
  }, []);

  async function ask(sentence: string) {
    const s = sentence.trim();
    if (!s || parsing) return;
    setText(s);
    setDraft("");
    setParsing(true);
    setError(null);
    setIntent(null);
    setQuote(null);
    setAgentProof(null);
    try {
      const res = await fetch("/api/send/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: s }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "I couldn't get a quote. Try again.");
      setIntent(data.intent);
      setQuote(data.quote);
      setAgentProof(data.agentProof ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  }

  async function confirm() {
    if (!intent || !quote || !text) return;
    setSending(true);
    setError(null);
    try {
      try {
        localStorage.setItem("zermitt:senderName", senderName);
      } catch {}
      const res = await fetch("/api/send/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, intent, quote, senderName, ...(agentProof ? { agentProof } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed. Nothing was charged. Try again.");
      setSuccess(data);
      setStep("shared");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.claimLink);
      setCopied(true);
    } catch {}
  }

  const who = intent ? titleCase(intent.recipient) : "";
  const payWith = intent?.asset === "NEAR" ? "NEAR" : "USDT";

  /* ── Step 3: link shared ─────────────────────────────────────────── */
  if (step === "shared" && success && intent && quote) {
    const from = senderName.trim() ? ` from ${senderName.trim()}` : "";
    const shareText = encodeURIComponent(`You've received $${Number(quote.amountOutFormatted).toFixed(2)}${from} on Zermitt. Claim it here: ${success.claimLink}`);
    return (
      <AppShell>
        <TopBar close="/wallet" />
        <div className="z-center" style={{ marginTop: 12 }}>
          <div className="z-success-ring"><Icon name="check" size={38} stroke={2.6} /></div>
          <h1 className="z-u" style={{ fontSize: 30, lineHeight: 1.1, margin: "20px 0 0" }}>Link ready<br /><span className="z-f">for {who}</span></h1>
          <p className="z-mut" style={{ margin: "10px 24px 0" }}>
            They open it, sign in with Google and the ${Number(quote.amountOutFormatted).toFixed(2)} is theirs. No app, no gas.
          </p>
        </div>

        <div className="z-card z-row-flex" style={{ marginTop: 24, padding: "14px 16px", gap: 12 }}>
          <span className="z-sm" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {success.claimLink.replace(/^https?:\/\//, "").split("#")[0]}
          </span>
          <button type="button" className="z-btn z-btn-sm" onClick={copyLink} aria-label="Copy claim link">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
          <Button variant="orange" href={`https://wa.me/?text=${shareText}`} external>WhatsApp</Button>
          <Button variant="ghost" href={`sms:?&body=${shareText}`} external>SMS</Button>
        </div>

        <h2 className="z-lab" style={{ margin: "26px 0 12px" }}>Status</h2>
        <ol className="z-timeline">
          <li><StatusDot state="done" /><span>Quote confirmed</span><span className="z-mut z-xs" style={{ marginLeft: "auto" }}>now</span></li>
          <li>
            <StatusDot state="done" />
            <a href={success.linkFundTxUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Claim link funded on NEAR <span className="z-blue">↗</span></a>
            <span className="z-mut z-xs" style={{ marginLeft: "auto" }}>now</span>
          </li>
          <li><StatusDot state="pending" /><span className="z-lemon">Waiting for {who} to claim</span></li>
        </ol>

        <div className="z-spacer" />
        {success.swapExecution === "mocked-demo" && (
          <p className="z-note" style={{ marginTop: 24 }}>
            On testnet the swap step is simulated, because NEAR Intents has no testnet. The quote was live, and the claim link and USDC payout are real on NEAR testnet.
          </p>
        )}
        <p className="z-xs z-mut z-center" style={{ marginTop: 12 }}>
          The receipt appears at <a href={`/r/${success.transferId}`} className="z-blue">/r/{success.transferId.slice(0, 8)}…</a> once it&apos;s claimed.
        </p>
      </AppShell>
    );
  }

  /* ── Step 2: review quote ────────────────────────────────────────── */
  if (step === "quote" && intent && quote) {
    return (
      <AppShell>
        <TopBar title="Review quote" back={() => setStep("chat")} />
        <section className="z-quote" style={{ marginTop: 26 }} aria-label="Quote">
          <Label>You send</Label>
          <p className="z-u" style={{ fontSize: 44, lineHeight: 1.05, margin: "6px 0 0" }}>
            {Number(quote.amountInFormatted).toFixed(2)} <span className="z-f" style={{ fontSize: 22 }}>{payWith}</span>
          </p>
          <div className="z-quote-sep" aria-hidden="true"><span /><Icon name="arrowDown" /><span /></div>
          <Label>{who} gets</Label>
          <p className="z-u" style={{ fontSize: 44, lineHeight: 1.05, margin: "6px 0 0" }}>
            {Number(quote.amountOutFormatted).toFixed(2)} <span className="z-f" style={{ fontSize: 22 }}>USDC</span>
          </p>
        </section>

        <dl className="z-card z-rows" style={{ marginTop: 16 }}>
          <Row label="To">{who} <span className="z-mut" style={{ fontWeight: 500 }}>· names their account on claim</span></Row>
          <Row label="Route">NEAR Intents · 1Click</Row>
          <Row label="Fee">${quote.feeUsd.toFixed(quote.feeUsd < 0.01 ? 4 : 2)}</Row>
          <Row label="Arrives">~{quote.timeEstimateSec}s</Row>
          <Row label={`Gas for ${who}`}><span className="z-lemon">$0.00</span></Row>
        </dl>
        <p className="z-mut z-xs" style={{ margin: "14px 4px 0" }}>
          Live quote. On testnet the swap step is simulated, because Intents has no testnet.
        </p>

        {error && <p className="z-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="z-spacer" style={{ minHeight: 24 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button variant="lemon" onClick={confirm} disabled={sending} aria-busy={sending}>
            {sending ? <><span className="z-spin" aria-hidden="true" /> Creating claim link…</> : "Confirm and send"}
          </Button>
          <Button variant="ghost" onClick={() => setStep("chat")} disabled={sending}>Edit</Button>
        </div>
      </AppShell>
    );
  }

  /* ── Step 1: chat ────────────────────────────────────────────────── */
  return (
    <AppShell>
      <TopBar title="New send" back="/wallet" />

      <div className="z-row-flex" style={{ marginTop: 16 }}>
        <label htmlFor="from" className="z-lab" style={{ flex: "none" }}>From</label>
        <input
          id="from"
          className="z-input"
          style={{ minHeight: 44 }}
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Your name, e.g. Victor"
          maxLength={40}
          autoComplete="given-name"
        />
      </div>

      <div className="z-chat" aria-live="polite">
        <Label className="z-center">Today</Label>

        {!text && (
          <div className="z-card z-bubble-agent">
            <AgentHeader />
            <div>Who are you sending to, and how much? Write it like a message.</div>
            <div className="z-chips">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" className="z-chip z-chip-btn" onClick={() => void ask(ex)}>&ldquo;{ex}&rdquo;</button>
              ))}
            </div>
          </div>
        )}

        {text && <div className="z-bubble-me">{text}</div>}

        {parsing && (
          <div className="z-card z-bubble-agent" aria-busy="true">
            <AgentHeader />
            <span className="z-typing" aria-label="Reading your message"><i /><i /><i /></span>
          </div>
        )}

        {!parsing && error && text && (
          <div className="z-card z-bubble-agent" role="alert">
            <AgentHeader />
            <div>{error}</div>
          </div>
        )}

        {!parsing && intent && quote && (
          <div className="z-card z-bubble-agent">
            <AgentHeader />
            <div>Got it. Here&apos;s what I understood:</div>
            <div className="z-chips">
              <Chip label="Amount" value={`$${intent.amount}`} />
              <Chip label="To" value={who} />
              <Chip label="Pay with" value={payWith} />
            </div>
            {agentProof ? (
              <div className="z-row-flex z-xs z-blue" style={{ gap: 6 }}><Icon name="shield" size={14} />Read privately in a NEAR AI Cloud TEE</div>
            ) : (
              <div className="z-xs z-mut">Read by the standard parser (not private)</div>
            )}
            <Button variant="lemon" onClick={() => setStep("quote")} style={{ marginTop: 14, minHeight: 46 }}>Get a quote</Button>
          </div>
        )}
      </div>

      <form
        className="z-row-flex"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label htmlFor="msg" className="z-sr">Message</label>
        <input
          id="msg"
          ref={inputRef}
          className="z-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Send $20 to Aunty Grace…"
          autoComplete="off"
        />
        <button type="submit" className="z-ico z-ico-lg z-ico-orange" style={{ borderRadius: "50%" }} aria-label="Send message" disabled={parsing || !draft.trim()}>
          <Icon name="send" />
        </button>
      </form>
    </AppShell>
  );
}

function AgentHeader() {
  return (
    <div className="z-row-flex" style={{ gap: 8, marginBottom: 10 }}>
      <Image src="/zermitt-mark.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />
      <span style={{ fontWeight: 700 }}>Zermitt</span>
    </div>
  );
}
