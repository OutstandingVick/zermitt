"use client";

/**
 * App home (design: home.html). Shows the Zermitt account known to this
 * device — the one claimed here, or `?account=` — with its live USDC
 * balance from NEAR and the transfers it received.
 *
 * Senders have no Zermitt account or send history (sending needs no
 * account), so the design's "recent sends" list is shown as this account's
 * received transfers.
 */
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell, BottomNav, Card, IconButton, Label, Money, Skeleton, titleCase } from "../ui";

type WalletData = {
  accountId: string;
  usdcBalance: number;
  history: Array<{ id: string; amountUsdc: string; claimedAt: string; payoutTxUrl: string | null; claimTxUrl: string | null }>;
};

function WalletInner() {
  const params = useSearchParams();
  const [account, setAccount] = useState<string | null>(params.get("account"));
  const [checked, setChecked] = useState(Boolean(params.get("account")));
  const [identity, setIdentity] = useState<string | null>(null);
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let acct = account;
    try {
      if (!acct) acct = localStorage.getItem("zermitt:account");
      if (acct) setIdentity(localStorage.getItem(`zermitt:identity:${acct}`));
    } catch {}
    if (acct !== account) setAccount(acct);
    setChecked(true);
  }, [account]);

  useEffect(() => {
    if (!account) return;
    setError(null);
    fetch(`/api/wallet?account=${encodeURIComponent(account)}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setData(d);
        else setError(d.error ?? "Couldn't load the balance.");
      })
      .catch(() => setError("Couldn't load the balance. Check your connection."));
  }, [account]);

  const name = account ? titleCase(account.split(".")[0]) : null;

  return (
    <AppShell nav>
      <div className="z-row-flex" style={{ justifyContent: "space-between" }}>
        <div className="z-row-flex">
          <Image src="/zermitt-mark.png" alt="Zermitt" width={36} height={36} style={{ borderRadius: 10 }} />
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{name ? `Hi, ${name}` : "Hi there"}</h1>
            <div className="z-mut z-xs">{account ?? "No account on this device yet"}</div>
          </div>
        </div>
        <IconButton label="How Zermitt works" icon="help" href="/#how" />
      </div>

      <section style={{ marginTop: 28 }} aria-labelledby="bal">
        <Label><span id="bal">Balance</span></Label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
          <div>
            {!checked || (account && !data && !error) ? (
              <><Skeleton h={44} w={150} /><Skeleton h={12} w={170} style={{ marginTop: 8 }} /></>
            ) : (
              <>
                <Money value={data?.usdcBalance ?? 0} size={44} />
                <div className="z-mut z-xs" style={{ marginTop: 6 }}>
                  {data ? `${data.usdcBalance} USDC · NEAR testnet` : "USDC · NEAR testnet"}
                </div>
              </>
            )}
          </div>
          <IconButton label="Send money" icon="send" href="/send" large tone="orange" />
        </div>
        {error && <p className="z-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </section>

      <Link href="/send" className="z-sentence" style={{ marginTop: 24 }}>
        <Label>Send by sentence</Label>
        <p className="z-f" style={{ fontSize: 26, lineHeight: 1.15, margin: "10px 0 22px" }}>&ldquo;Send $40<br />to Mum&rdquo;</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>
          <span>$0.00 gas for family</span><span>Tap to type →</span>
        </div>
      </Link>

      <div id="receipts" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 10px", scrollMarginTop: 20 }}>
        <Label>Received</Label>
        <span className="z-mut z-xs">Each has a receipt on NEAR</span>
      </div>
      <Card pad={false} className="z-list">
        {!checked || (account && !data && !error) ? (
          <div style={{ padding: "12px 0" }}><Skeleton h={40} /><Skeleton h={40} style={{ marginTop: 12 }} /></div>
        ) : !account ? (
          <p className="z-mut z-sm" style={{ margin: "14px 0" }}>
            Nothing here yet. When someone sends you money, claim the link and it shows up here. Or <Link href="/send" style={{ fontWeight: 700 }}>send money</Link> to someone.
          </p>
        ) : data && data.history.length > 0 ? (
          data.history.map((h) => (
            <Link key={h.id} href={`/r/${h.id}`} className="z-list-item">
              <span className="z-avatar" aria-hidden="true">{(name ?? "Z")[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>Received</div>
                <div className="z-mut z-xs">Claimed · {new Date(h.claimedAt).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>+${Number(h.amountUsdc).toFixed(2)}</div>
                <div className="z-blue" style={{ fontSize: 11 }}>Receipt ›</div>
              </div>
            </Link>
          ))
        ) : (
          <p className="z-mut z-sm" style={{ margin: "14px 0" }}>
            {data && data.usdcBalance > 0
              ? "No history on this server. History is kept by the server that handled the transfer; the balance above is read live from NEAR."
              : "No transfers yet."}
          </p>
        )}
      </Card>

      <div id="profile" style={{ marginTop: 26, scrollMarginTop: 20 }}>
        <Label className="" >Profile</Label>
        <Card className="" pad={false}>
          <dl className="z-rows">
            <div className="z-rowi"><dt>Account</dt><dd>{account ?? "—"}</dd></div>
            <div className="z-rowi"><dt>Signed in as</dt><dd>{identity && identity !== "mock" ? identity : account ? "Demo login" : "—"}</dd></div>
            <div className="z-rowi"><dt>Key</dt><dd>{account ? "Stored on this device" : "—"}</dd></div>
          </dl>
        </Card>
      </div>

      <BottomNav active="home" />
    </AppShell>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<AppShell nav><Skeleton h={160} /></AppShell>}>
      <WalletInner />
    </Suspense>
  );
}
