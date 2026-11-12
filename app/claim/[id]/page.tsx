"use client";

/**
 * Claim page: "You've received $X" → sign in with Google (Privy, or the
 * mocked path in DEMO_MODE) → pick a name → claim.
 *
 * The recipient never signs an on-chain transaction: the browser generates
 * a fresh ed25519 keypair, sends only the PUBLIC key to the server, and the
 * relayer performs every on-chain step. The private key stays in this
 * browser (localStorage), linked to the signed-in identity.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { KeyPair } from "near-api-js";

type ClaimInfo = {
  state: { state: string; reason?: string; recipientAccountId?: string };
  amountUsd?: number;
  usdcAmount?: string;
  suggestedName?: string;
  recipientAccountId?: string;
  mockLogin?: boolean;
  privyAppId?: string | null;
};
type ClaimSuccess = {
  accountId: string;
  usdcAmount: string;
  txUrls: Record<string, string>;
};

const box: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 };
const btn: React.CSSProperties = { width: "100%", padding: 14, borderRadius: 8, fontSize: 16 };

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
      const claimKey = new URLSearchParams(window.location.hash.slice(1)).get("k");
      if (!claimKey) throw new Error("This link is missing its claim key.");
      const kp = KeyPair.fromRandom("ed25519");
      const res = await fetch(`/api/claim/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, publicKey: kp.getPublicKey().toString(), claimKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Claim failed");
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
      <div style={box}>
        <p style={{ fontSize: 20, margin: 0 }}>🎉 Claimed!</p>
        <p>
          <strong>{success.usdcAmount} USDC</strong> is in your new account{" "}
          <code>{success.accountId}</code>
        </p>
        <p style={{ fontSize: 13 }}>
          {Object.entries(success.txUrls).map(([k, url]) => (
            <span key={k}>
              <a href={url}>{k} tx ↗</a>{" "}
            </span>
          ))}
        </p>
        <a href={`/wallet?account=${success.accountId}`}>
          <button style={btn}>See my balance</button>
        </a>
        <p style={{ fontSize: 14 }}>
          <a href={`/r/${id}`}>Public on-chain receipt ↗</a>
        </p>
      </div>
    );
  }

  if (!email) {
    return info.mockLogin ? (
      <button style={btn} onClick={() => setEmail("demo.judge@example.com")}>
        Continue with Google (mock)
      </button>
    ) : (
      <RealGoogleLogin onEmail={setEmail} />
    );
  }

  return (
    <div style={box}>
      <p style={{ margin: 0 }}>Signed in as <strong>{email}</strong></p>
      <p>Pick your account name:</p>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
        />
        <span style={{ color: "#777" }}>.zermitt.testnet</span>
      </div>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <button style={{ ...btn, marginTop: 12 }} onClick={doClaim} disabled={busy || !name}>
        {busy ? "Claiming…" : "Claim"}
      </button>
      <p style={{ fontSize: 12, color: "#777" }}>
        Gas is paid by Zermitt — you never need NEAR to claim.
      </p>
    </div>
  );
}

/**
 * Real Google login seam. Privy's React SDK currently breaks the Next build
 * (its Solana peer-dependency tree resolves inconsistently), so the real
 * integration is deliberately not shipped yet — see README ("Google
 * sign-in" row) and scripts/spikes/02-social-login.md. The claim flow only
 * needs an email from this component, so swapping in Privy's useLogin here
 * is the entire integration surface.
 */
function RealGoogleLogin(_props: { onEmail: (e: string) => void }) {
  return (
    <div style={box}>
      <p>
        Real Google sign-in is not configured in this build. Set{" "}
        <code>MOCK_LOGIN=true</code> (demo default) to use the mocked path.
      </p>
    </div>
  );
}

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<ClaimInfo | null>(null);

  useEffect(() => {
    fetch(`/api/claim/${id}`).then(async (r) => setInfo(await r.json()));
  }, [id]);

  let body: React.ReactNode = <p>Loading…</p>;
  if (info) {
    const s = info.state.state;
    if (s === "invalid") body = <p>❌ {info.state.reason ?? "This claim link is invalid."}</p>;
    else if (s === "expired") body = <p>⌛ This claim link has expired. Ask the sender for a new one.</p>;
    else if (s === "already-claimed")
      body = (
        <p>
          ✅ Already claimed{info.recipientAccountId ? <> into <code>{info.recipientAccountId}</code></> : null}.{" "}
          {info.recipientAccountId && <a href={`/wallet?account=${info.recipientAccountId}`}>See the balance</a>}
        </p>
      );
    else
      body = (
        <>
          <p style={{ fontSize: 28, margin: "8px 0" }}>
            You&rsquo;ve received <strong>${Number(info.amountUsd).toFixed(2)}</strong>
          </p>
          <p style={{ color: "#555" }}>{info.usdcAmount} USDC on NEAR, waiting for you.</p>
          <ClaimFlow info={info} id={id} />
        </>
      );
  }

  const content = (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem", fontSize: 16 }}>
      <h1 style={{ fontSize: 24 }}>Zermitt</h1>
      {body}
    </main>
  );

  return content;
}
