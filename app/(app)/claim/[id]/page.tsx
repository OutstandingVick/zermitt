"use client";

/**
 * Claim page (design: claim.html): amount hero → choose a name → Continue
 * with Google. Signing in is the claim: once a Google identity is available
 * (Privy, or the simulated login in demo mode) the claim runs with the
 * chosen name.
 *
 * The recipient never signs an on-chain transaction: the browser generates
 * a fresh ed25519 keypair, sends only the PUBLIC key to the server, and the
 * relayer performs every on-chain step. The private key stays in this
 * browser (localStorage), linked to the signed-in identity.
 */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { KeyPair } from "near-api-js";
import { AppShell, Button, Icon, Label, Money, Skeleton, StatusDot, cents2 } from "../../ui";

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
type ClaimSuccess = { accountId: string; usdcAmount: string; txUrls: Record<string, string> };

const TX_LABELS: Record<string, string> = {
  create: "Account created",
  claim: "Link claimed",
  storage: "USDC enabled",
  payout: "USDC sent",
  receipt: "Receipt recorded",
};

/** Privy is loaded only when real login is on, so demo mode never ships it. */
const PrivyGoogleLogin = dynamic(() => import("./privy-login"), {
  ssr: false,
  loading: () => (
    <button type="button" className="z-btn z-btn-light" disabled>
      <span className="z-spin" aria-hidden="true" /> Loading sign-in…
    </button>
  ),
});

/* The claim key lives in the URL fragment, which OAuth redirects drop.
   Keep a per-tab copy (and the chosen name) for the return trip. */
const keyStore = (id: string) => `zermitt:claimKey:${id}`;
const intentStore = (id: string) => `zermitt:claimIntent:${id}`;
function rememberClaimKey(id: string) {
  const k = new URLSearchParams(window.location.hash.slice(1)).get("k");
  if (!k) return;
  try {
    sessionStorage.setItem(keyStore(id), k);
  } catch {}
}
function readClaimKey(id: string): string | null {
  const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("k");
  if (fromHash) return fromHash;
  try {
    return sessionStorage.getItem(keyStore(id));
  } catch {
    return null;
  }
}

function ClaimFlow({ info, id, onClaimed }: { info: ClaimInfo; id: string; onClaimed: () => void }) {
  const parent = info.parentAccount ?? "zermitt.testnet";
  const [name, setName] = useState(info.suggestedName ?? "");
  const [email, setEmail] = useState<string | null>(null);
  const [wantClaim, setWantClaim] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ClaimSuccess | null>(null);
  const attempted = useRef(false);

  // Restore the name and intent saved before a Google redirect.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(intentStore(id));
      if (saved) {
        setName(saved);
        setWantClaim(true);
      }
    } catch {}
  }, [id]);

  const doClaim = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const claimKey = readClaimKey(id);
      if (!claimKey) throw new Error("This link is missing its claim key. Open the full link you were sent.");
      const kp = KeyPair.fromRandom("ed25519");
      const res = await fetch(`/api/claim/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), publicKey: kp.getPublicKey().toString(), claimKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Claim failed. Your money is safe. Try again.");
      try {
        localStorage.setItem(`zermitt:key:${data.accountId}`, kp.toString());
        localStorage.setItem(`zermitt:identity:${data.accountId}`, email ?? "mock");
        localStorage.setItem("zermitt:account", data.accountId);
        sessionStorage.removeItem(intentStore(id));
      } catch {}
      setSuccess(data);
      onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setWantClaim(false);
      try {
        sessionStorage.removeItem(intentStore(id));
      } catch {}
    } finally {
      setBusy(false);
    }
  }, [id, name, email, onClaimed]);

  // Signing in is the claim: run it once an identity and the intent exist.
  useEffect(() => {
    if (wantClaim && email && !busy && !success && !attempted.current) {
      attempted.current = true;
      void doClaim();
    }
  }, [wantClaim, email, busy, success, doClaim]);

  function start() {
    if (!name.trim()) return;
    attempted.current = false;
    setError(null);
    try {
      sessionStorage.setItem(intentStore(id), name.trim());
    } catch {}
    setWantClaim(true);
    if (info.mockLogin) setEmail("demo.judge@example.com");
  }

  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="z-card z-pad">
          <p className="z-center" style={{ margin: 0 }}>
            <span className="z-badge z-badge-lemon">It&apos;s yours</span>
          </p>
          <p className="z-center z-sm" style={{ margin: "10px 0 14px" }}>
            {cents2(Number(success.usdcAmount))} USDC is in <b>{success.accountId}</b>
          </p>
          <ul className="z-timeline">
            {Object.entries(success.txUrls).map(([k, url]) => (
              <li key={k}>
                <StatusDot state="done" />
                <span>{TX_LABELS[k] ?? k}</span>
                <a href={url} target="_blank" rel="noreferrer" className="z-blue z-xs" style={{ marginLeft: "auto" }}>View ↗</a>
              </li>
            ))}
          </ul>
        </div>
        <Button variant="lemon" href={`/wallet?account=${success.accountId}`}>See my balance</Button>
        <Button variant="ghost" href={`/r/${id}`}>View receipt on NEAR</Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Label htmlFor="nm">Choose your name</Label>
      <div className="z-field">
        <input
          id="nm"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          aria-describedby="nm-suffix"
        />
        <span id="nm-suffix">.{parent}</span>
      </div>

      {error && <p className="z-alert" role="alert" style={{ margin: 0 }}>{error}</p>}

      {busy ? (
        <>
          <button type="button" className="z-btn z-btn-light" disabled aria-busy="true">
            <span className="z-spin" aria-hidden="true" /> Claiming…
          </button>
          <p className="z-mut z-xs z-center" style={{ margin: 0 }} aria-live="polite">
            {email && email !== "demo.judge@example.com" ? `Signed in as ${email}. ` : ""}
            Takes about a minute: creating your account, sending the USDC and recording the receipt on NEAR.
          </p>
        </>
      ) : info.mockLogin ? (
        <button type="button" className="z-btn z-btn-light" onClick={start} disabled={!name.trim()}>
          <Icon name="google" /> Continue with Google
        </button>
      ) : info.privyAppId ? (
        <PrivyGoogleLogin appId={info.privyAppId} onEmail={setEmail} onStart={start} disabled={!name.trim()} />
      ) : (
        <p className="z-alert" role="alert" style={{ margin: 0 }}>Google sign-in is not configured.</p>
      )}

      {!busy && (
        <p className="z-mut z-xs z-center" style={{ margin: 0 }}>
          Gas is paid by Zermitt. You never need crypto to claim.
          {info.mockLogin && <><br />Demo mode: Google sign-in is simulated.</>}
        </p>
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="z-row-flex" style={{ justifyContent: "center" }}>
      <Image src="/zermitt-mark.png" alt="" width={28} height={28} style={{ borderRadius: 8 }} />
      <span className="z-f" style={{ fontSize: 20 }}>Zermitt</span>
    </div>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <AppShell glow>
      <Brand />
      <div className="z-center" style={{ marginTop: 64 }}>
        <h1 className="z-u" style={{ fontSize: 30, lineHeight: 1.15, margin: 0 }}>{title}</h1>
        <p className="z-mut" style={{ margin: "12px 12px 0" }}>{body}</p>
      </div>
      <div className="z-spacer" />
      {children && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </AppShell>
  );
}

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const markClaimed = useCallback(() => setClaimed(true), []);

  useEffect(() => {
    rememberClaimKey(id);
    fetch(`/api/claim/${id}`)
      .then(async (r) => setInfo(await r.json()))
      .catch(() => setLoadError(true));
  }, [id]);

  if (loadError) return <Message title="Couldn't load this link" body="Check your connection and refresh the page." />;

  if (!info)
    return (
      <AppShell glow>
        <Brand />
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }} aria-busy="true">
          <Skeleton h={12} w={110} />
          <Skeleton h={64} w={200} />
          <Skeleton h={14} w={220} />
        </div>
      </AppShell>
    );

  const s = info.state.state;
  if (s === "invalid") return <Message title="Link not found" body={`${info.state.reason ?? "This claim link is invalid."} Check you opened the whole link.`} />;
  if (s === "expired") return <Message title="This link has expired" body="Ask the sender for a new one. Unclaimed money is never lost." />;
  if (s === "already-claimed")
    return (
      <Message
        title="Already claimed"
        body={info.recipientAccountId ? `This money went to ${info.recipientAccountId}.` : "This money has been collected."}
      >
        {info.recipientAccountId && <Button variant="lemon" href={`/wallet?account=${info.recipientAccountId}`}>See the balance</Button>}
        <Button variant="ghost" href={`/r/${id}`}>View receipt</Button>
      </Message>
    );

  const usdc = Number(info.usdcAmount ?? info.amountUsd ?? 0);
  return (
    <AppShell glow>
      <Brand />
      <section className="z-center" style={{ marginTop: 44 }} aria-label="Amount">
        <Label>{info.senderName ? `${info.senderName} sent you` : "You've received"}</Label>
        <div style={{ marginTop: 12 }}><Money value={usdc} size={64} /></div>
        <p className="z-mut z-sm" style={{ margin: "8px 0 0" }}>{cents2(usdc)} USDC on NEAR, {claimed ? "now in your account" : "waiting for you"}</p>
      </section>
      <div className="z-spacer" style={{ minHeight: 32 }} />
      <ClaimFlow info={info} id={id} onClaimed={markClaimed} />
    </AppShell>
  );
}
