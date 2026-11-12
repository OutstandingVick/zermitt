"use client";

/**
 * Send flow: chat input → quote card → Confirm → success with claim link.
 * Mobile-first. In DEMO_MODE the swap step is mocked and labeled; the
 * quote shown is real mainnet pricing from the 1Click API.
 */
import { useState } from "react";

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

const box: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 16,
};

export default function SendPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [success, setSuccess] = useState<SendSuccess | null>(null);

  async function getQuote() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/send/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote failed");
      setIntent(data.intent);
      setQuote(data.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIntent(null);
      setQuote(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/send/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, intent, quote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const shareText = success
    ? encodeURIComponent(`I sent you money with Zermitt! Claim it here: ${success.claimLink}`)
    : "";

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem", fontSize: 16 }}>
      <h1 style={{ fontSize: 24 }}>Send money</h1>

      {!success && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && text && getQuote()}
              placeholder='e.g. "send $50 to mum"'
              style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
            />
            <button onClick={getQuote} disabled={busy || !text} style={{ padding: "12px 16px", borderRadius: 8 }}>
              {busy && !quote ? "…" : "Go"}
            </button>
          </div>

          {error && <p style={{ color: "#b00020" }}>{error}</p>}

          {intent && quote && (
            <div style={box}>
              <p style={{ margin: 0 }}>
                Send <strong>${intent.amount}</strong> to <strong>{intent.recipient}</strong>
              </p>
              <p style={{ margin: "8px 0 0", color: "#444" }}>
                They receive <strong>{quote.amountOutFormatted} USDC</strong> on NEAR
                <br />
                Fee ~${quote.feeUsd.toFixed(4)} · rate {quote.rate.toFixed(4)} · ~{quote.timeEstimateSec}s
              </p>
              <p style={{ fontSize: 13, color: "#777" }}>
                Real quote via NEAR Intents (1Click). In demo mode the swap execution is
                simulated — the claim link is real, on testnet.
              </p>
              <button
                onClick={confirm}
                disabled={busy}
                style={{ width: "100%", padding: 14, borderRadius: 8, fontSize: 16, marginTop: 8 }}
              >
                {busy ? "Sending…" : "Confirm"}
              </button>
            </div>
          )}
        </>
      )}

      {success && (
        <div style={box}>
          <p style={{ fontSize: 20, margin: 0 }}>✅ Sent!</p>
          <p style={{ fontSize: 13, color: "#777" }}>{success.swapNote}</p>
          <p>
            Claim link:{" "}
            <a href={success.claimLink} style={{ wordBreak: "break-all" }}>
              {success.claimLink}
            </a>
          </p>
          <p>
            <a href={success.linkFundTxUrl}>View the funding transaction on testnet ↗</a>
            <br />
            <a href={`/r/${success.transferId}`}>Public receipt (pending until claimed) ↗</a>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 8, background: "#25D366", color: "#fff", textDecoration: "none" }}
            >
              WhatsApp
            </a>
            <a
              href={`sms:?&body=${shareText}`}
              style={{ flex: 1, textAlign: "center", padding: 12, borderRadius: 8, background: "#007AFF", color: "#fff", textDecoration: "none" }}
            >
              SMS
            </a>
          </div>
          <button onClick={() => { setSuccess(null); setQuote(null); setIntent(null); setText(""); }} style={{ marginTop: 12 }}>
            Send another
          </button>
        </div>
      )}
    </main>
  );
}
