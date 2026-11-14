"use client";

/** Balance screen: account name, USDC balance in dollars, received history. */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type WalletData = {
  accountId: string;
  usdcBalance: number;
  history: Array<{
    id: string;
    amountUsdc: string;
    claimedAt: string;
    payoutTxUrl: string | null;
    claimTxUrl: string | null;
  }>;
};

function WalletInner() {
  const params = useSearchParams();
  const [account, setAccount] = useState<string | null>(params.get("account"));
  const [checked, setChecked] = useState(Boolean(params.get("account")));
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) return;
    try {
      setAccount(localStorage.getItem("zermitt:account"));
    } catch {}
    setChecked(true);
  }, [account]);

  useEffect(() => {
    if (!account) return;
    fetch(`/api/wallet?account=${encodeURIComponent(account)}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setData(d);
        else setError(d.error ?? "Couldn't load the balance.");
      })
      .catch(() => setError("Couldn't load the balance. Check your connection."));
  }, [account]);

  if (!account && checked)
    return (
      <div className="card stack center">
        <h2>No account yet</h2>
        <p className="lead">When someone sends you money, claim it and your balance shows up here.</p>
        <a className="btn btn-primary btn-block" href="/send">Send money instead</a>
      </div>
    );
  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!data)
    return (
      <div className="card stack-sm" aria-busy="true">
        <div className="skeleton" style={{ height: 14, width: "50%" }} />
        <div className="skeleton" style={{ height: 52, width: "45%" }} />
      </div>
    );

  return (
    <>
      <div className="card card-soft stack-sm">
        <div className="label">Balance</div>
        <p className="amount-hero">${data.usdcBalance.toFixed(2)}</p>
        <p className="small muted" style={{ margin: 0 }}>
          USDC on NEAR testnet · <code>{data.accountId}</code>
        </p>
      </div>

      <h2>History</h2>
      {data.history.length === 0 ? (
        <p className="muted small">
          {data.usdcBalance > 0
            ? "No history on this server. History is kept by the server that handled the transfer; the balance above is read live from NEAR."
            : "No transfers yet."}
        </p>
      ) : (
        data.history.map((h) => (
          <div key={h.id} className="card stack-sm">
            <div className="row">
              <strong className="grow">Received</strong>
              <strong>+{Number(h.amountUsdc).toFixed(2)} USDC</strong>
            </div>
            <p className="tiny muted" style={{ margin: 0 }}>{new Date(h.claimedAt).toLocaleString()}</p>
            <div className="links">
              {h.claimTxUrl && <a href={h.claimTxUrl} target="_blank" rel="noreferrer">Claim tx ↗</a>}
              {h.payoutTxUrl && <a href={h.payoutTxUrl} target="_blank" rel="noreferrer">Payout tx ↗</a>}
              <a href={`/r/${h.id}`}>Receipt ↗</a>
            </div>
          </div>
        ))
      )}
    </>
  );
}

export default function WalletPage() {
  return (
    <main className="container stack">
      <h1>My money</h1>
      <Suspense fallback={<div className="skeleton" style={{ height: 120 }} />}>
        <WalletInner />
      </Suspense>
    </main>
  );
}
