"use client";

/**
 * Send flow: chat input → quote card → Confirm → success with claim link.
 * In DEMO_MODE the swap step is mocked and labeled; the quote shown is real
 * mainnet pricing from the 1Click API.
 */
import { useEffect, useState } from "react";

type Intent = { amount: number; asset: string; recipient: string };
type Quote = {
  amountInFormatted: string;
  amountOutFormatted: string;
  feeUsd: number;
  rate: number;
  timeEstimateSec: number;
};
type SendSuccess = {
  claimLink: string;
  linkFundTxUrl: string;
  swapExecution: string;
  swapNote: string;
  transferId: string;
};

const EXAMPLES = ["send $50 to mum", "send $20 to tunde", "pay 15 usdc to aunty grace"];

export default function SendPage() {
  const [senderName, setSenderName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"quote" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [agentProof, setAgentProof] = useState<unknown>(null);
  const [success, setSuccess] = useState<SendSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setSenderName(localStorage.getItem("zermitt:senderName") ?? "");
    } catch {}
  }, []);

  async function getQuote(sentence = text) {
    if (!sentence.trim()) return;
    setBusy("quote");
    setError(null);
    setSuccess(null);
    setIntent(null);
    setQuote(null);
    try {
      const res = await fetch("/api/send/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't get a quote. Try again.");
      setIntent(data.intent);
      setQuote(data.quote);
      setAgentProof(data.agentProof ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    setBusy("send");
    setError(null);
    try {
      try {
        localStorage.setItem("zermitt:senderName", senderName);
      } catch {}
      const res = await fetch("/api/send/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          intent,
          quote,
          senderName,
          ...(agentProof ? { agentProof } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed. Nothing was charged — try again.");
      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setSuccess(null);
    setQuote(null);
    setIntent(null);
    setText("");
    setCopied(false);
  }

  async function copyLink() {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.claimLink);
      setCopied(true);
    } catch {}
  }

  if (success && intent) {
    const from = senderName.trim() ? ` from ${senderName.trim()}` : "";
    const shareText = encodeURIComponent(
      `You've received $${intent.amount}${from} on Zermitt. Claim it here: ${success.claimLink}`
    );
    return (
      <main className="container stack">
        <div className="center stack-sm">
          <span className="badge">Link ready</span>
          <h1>${intent.amount} is on its way to {intent.recipient}</h1>
          <p className="lead">Share the claim link. They sign in with Google to collect it.</p>
        </div>

        <div className="card stack-sm">
          <div className="label">Claim link</div>
          <code className="tiny">{success.claimLink}</code>
          <button className="btn btn-secondary btn-block" onClick={copyLink}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <div className="row">
            <a className="btn btn-whatsapp grow" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a className="btn btn-sms grow" href={`sms:?&body=${shareText}`}>
              SMS
            </a>
          </div>
        </div>

        {success.swapExecution === "mocked-demo" && (
          <p className="alert alert-warn">
            🧪 Demo mode: the currency swap is simulated (NEAR Intents has no testnet). The quote was
            real, and the claim link and USDC payout are real on NEAR testnet.
          </p>
        )}

        <div className="links">
          <a href={success.linkFundTxUrl} target="_blank" rel="noreferrer">Funding transaction ↗</a>
          <a href={`/r/${success.transferId}`}>Receipt (after claim) ↗</a>
        </div>

        <button className="btn btn-secondary btn-block" onClick={reset}>Send another</button>
      </main>
    );
  }

  return (
    <main className="container stack">
      <div className="stack-sm">
        <h1>Send money</h1>
        <p className="lead">Say it like a message. We&rsquo;ll show you the price first.</p>
      </div>

      <div className="card stack-sm">
        <label className="label" htmlFor="sender">Your name</label>
        <input
          id="sender"
          className="input"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="e.g. Victor"
          maxLength={40}
          autoComplete="given-name"
        />
        <label className="label" htmlFor="sentence" style={{ marginTop: 12, display: "block" }}>What to send</label>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void getQuote();
          }}
        >
          <input
            id="sentence"
            className="input grow"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "send $50 to mum"'
            autoComplete="off"
          />
          <button className="btn btn-primary" type="submit" disabled={busy !== null || !text.trim()} aria-label="Get quote">
            {busy === "quote" ? <span className="spinner" /> : "Go"}
          </button>
        </form>
        {!intent && !busy && (
          <div className="links">
            {EXAMPLES.map((ex) => (
              <a
                key={ex}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setText(ex);
                  void getQuote(ex);
                }}
              >
                &ldquo;{ex}&rdquo;
              </a>
            ))}
          </div>
        )}
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {busy === "quote" && (
        <div className="card stack-sm" aria-busy="true">
          <div className="skeleton" style={{ height: 20, width: "60%" }} />
          <div className="skeleton" style={{ height: 36, width: "40%" }} />
          <div className="skeleton" style={{ height: 14, width: "80%" }} />
        </div>
      )}

      {intent && quote && (
        <div className="card stack">
          <div className="stack-sm">
            <div className="label">You send</div>
            <p className="amount">${intent.amount}</p>
            <p className="small muted" style={{ margin: 0 }}>to <strong style={{ color: "var(--ink)" }}>{intent.recipient}</strong></p>
          </div>
          <hr className="divider" />
          <dl style={{ margin: 0 }}>
            <div className="kv"><dt>They receive</dt><dd>{quote.amountOutFormatted} USDC</dd></div>
            <div className="kv"><dt>Network fee</dt><dd>${quote.feeUsd.toFixed(4)}</dd></div>
            <div className="kv"><dt>Rate</dt><dd>{quote.rate.toFixed(4)}</dd></div>
            <div className="kv"><dt>Arrives in</dt><dd>~{quote.timeEstimateSec}s</dd></div>
          </dl>
          <p className="tiny muted" style={{ margin: 0 }}>
            Live quote from NEAR Intents (1Click). In demo mode the swap itself is simulated; the
            claim link and payout are real on testnet.
          </p>
          <button className="btn btn-primary btn-block" onClick={confirm} disabled={busy !== null}>
            {busy === "send" ? (<><span className="spinner" /> Creating claim link…</>) : `Confirm and send $${intent.amount}`}
          </button>
        </div>
      )}
    </main>
  );
}
