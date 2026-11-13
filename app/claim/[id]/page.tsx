"use client";

/**
 * Claim page: "You've received $X from Victor" → sign in with Google (Privy,
 * or the mocked path in DEMO_MODE) → pick a name → claim.
 *
 * The recipient never signs an on-chain transaction: the browser generates
 * a fresh ed25519 keypair, sends only the PUBLIC key to the server, and the
 * relayer performs every on-chain step. The private key stays in this
 * browser (localStorage), linked to the signed-in identity.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { KeyPair } from "near-api-js";

type ClaimInfo = {
  state: { state: string; reason?: string; recipientAccountId?: string };
  amountUsd?: number;
  usdcAmount?: string;
  suggestedName?: string;
  recipientAccountId?: string;
  senderName?: string | null;
  parentAccount?: string;
  mockLogin?: boolean;
  privyAppId?: string | null;
};
type ClaimSuccess = {
  accountId: string;
  usdcAmount: string;
  txUrls: Record<string, string>;
};

const TX_LABELS: Record<string, string> = {
  create: "Account created",
  claim: "Link claimed",
  storage: "USDC enabled",
  payout: "USDC sent",
  receipt: "Receipt recorded",
};

function ClaimFlow({ info, id }: { info: ClaimInfo; id: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState(info.suggestedName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ClaimSuccess | null>(null);

  async function doClaim() {
    setBusy(true);
    setError(null);
    try {
      const claimKey = readClaimKey(id);
      if (!claimKey) throw new Error("This link is missing its claim key. Open the full link you were sent.");
      const kp = KeyPair.fromRandom("ed25519");
      const res = await fetch(`/api/claim/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, publicKey: kp.getPublicKey().toString(), claimKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Claim failed. Your money is safe — try again.");
      try {
        localStorage.setItem(`zermitt:key:${data.accountId}`, kp.toString());
        localStorage.setItem(`zermitt:identity:${data.accountId}`, email ?? "mock");
        localStorage.setItem("zermitt:account", data.accountId);
      } catch {}
      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="card stack">
        <div className="center stack-sm">
          <span className="badge">Claimed</span>
          <p className="amount">{Number(success.usdcAmount).toFixed(2)} USDC</p>
          <p className="small muted" style={{ margin: 0 }}>is in <code>{success.accountId}</code></p>
        </div>
        <ul className="checks">
          {Object.entries(success.txUrls).map(([k, url]) => (
            <li key={k}>
              ✅ {TX_LABELS[k] ?? k} · <a href={url} target="_blank" rel="noreferrer">view ↗</a>
            </li>
          ))}
        </ul>
        <a className="btn btn-primary btn-block" href={`/wallet?account=${success.accountId}`}>See my balance</a>
        <a className="btn btn-secondary btn-block" href={`/r/${id}`}>View receipt on NEAR</a>
      </div>
    );
  }

  if (!email) {
    return info.mockLogin ? (
      <div className="stack-sm">
        <button className="btn btn-primary btn-block" onClick={() => setEmail("demo.judge@example.com")}>
          Continue with Google
        </button>
        <p className="tiny muted center" style={{ margin: 0 }}>Demo mode: sign-in is simulated, no account needed.</p>
      </div>
    ) : (
      <RealGoogleLogin appId={info.privyAppId} onEmail={setEmail} />
    );
  }

  return (
    <div className="card stack">
      <p className="small muted" style={{ margin: 0 }}>
        Signed in as <strong style={{ color: "var(--ink)" }}>{email}</strong>
      </p>
      <div className="stack-sm">
        <label className="label" htmlFor="name">Choose your account name</label>
        <div className="input-suffix">
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoComplete="off"
            disabled={busy}
          />
          <span>.{info.parentAccount ?? "zermitt.testnet"}</span>
        </div>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" onClick={doClaim} disabled={busy || !name}>
        {busy ? (<><span className="spinner" /> Claiming…</>) : "Claim my money"}
      </button>
      {busy && (
        <p className="tiny muted center" style={{ margin: 0 }}>
          Takes about a minute: creating your account, sending the USDC and recording the receipt on NEAR.
        </p>
      )}
    </div>
  );
}

/** Privy is loaded only when real login is on, so demo mode never ships it. */
const PrivyGoogleLogin = dynamic(() => import("./privy-login"), {
  ssr: false,
  loading: () => (
    <button className="btn btn-primary btn-block" disabled>
      <span className="spinner" /> Loading sign-in…
    </button>
  ),
});

function RealGoogleLogin({ appId, onEmail }: { appId?: string | null; onEmail: (e: string) => void }) {
  if (!appId) return <p className="alert alert-error">Google sign-in is not configured.</p>;
  return <PrivyGoogleLogin appId={appId} onEmail={onEmail} />;
}

/**
 * The claim key lives in the URL fragment, which OAuth redirects (Google via
 * Privy) drop on the way back. Keep a per-tab copy so the claim still works
 * after sign-in.
 */
function rememberClaimKey(id: string) {
  const k = new URLSearchParams(window.location.hash.slice(1)).get("k");
  if (!k) return;
  try {
    sessionStorage.setItem(`zermitt:claimKey:${id}`, k);
  } catch {}
}

function readClaimKey(id: string): string | null {
  const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("k");
  if (fromHash) return fromHash;
  try {
    return sessionStorage.getItem(`zermitt:claimKey:${id}`);
  } catch {
    return null;
  }
}

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    rememberClaimKey(id);
    fetch(`/api/claim/${id}`)
      .then(async (r) => setInfo(await r.json()))
      .catch(() => setLoadError(true));
  }, [id]);

  if (loadError)
    return (
      <main className="container">
        <p className="alert alert-error">Couldn&rsquo;t load this link. Check your connection and refresh.</p>
      </main>
    );

  if (!info)
    return (
      <main className="container stack" aria-busy="true">
        <div className="skeleton" style={{ height: 16, width: "40%", margin: "40px auto 0" }} />
        <div className="skeleton" style={{ height: 52, width: "60%", margin: "0 auto" }} />
        <div className="skeleton" style={{ height: 48 }} />
      </main>
    );

  const s = info.state.state;
  if (s === "invalid")
    return (
      <main className="container stack center">
        <h1>Link not found</h1>
        <p className="lead">{info.state.reason ?? "This claim link is invalid."} Check you opened the whole link.</p>
      </main>
    );
  if (s === "expired")
    return (
      <main className="container stack center">
        <h1>This link has expired</h1>
        <p className="lead">Ask the sender to send a new one. Unclaimed money is never lost.</p>
      </main>
    );
  if (s === "already-claimed")
    return (
      <main className="container stack center">
        <span className="badge">Already claimed</span>
        <h1>This money has been collected</h1>
        {info.recipientAccountId && (
          <>
            <p className="lead">It went to <code>{info.recipientAccountId}</code>.</p>
            <a className="btn btn-primary btn-block" href={`/wallet?account=${info.recipientAccountId}`}>See the balance</a>
            <a className="btn btn-secondary btn-block" href={`/r/${id}`}>View receipt</a>
          </>
        )}
      </main>
    );

  return (
    <main className="container stack">
      <section className="center stack-sm" style={{ paddingTop: 24 }}>
        <p className="lead">{info.senderName ? `${info.senderName} sent you` : "You've received"}</p>
        <p className="amount-hero">${Number(info.usdcAmount ?? info.amountUsd).toFixed(2)}</p>
        <p className="small muted" style={{ margin: 0 }}>{info.usdcAmount} USDC (digital dollars) on NEAR</p>
      </section>
      <ClaimFlow info={info} id={id} />
      <p className="trust">
        <span>Gas paid by Zermitt</span>·<span>Receipt on NEAR</span>
      </p>
    </main>
  );
}
