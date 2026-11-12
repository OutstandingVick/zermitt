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
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      try {
        setAccount(localStorage.getItem("zermitt:account"));
      } catch {}
    }
  }, [account]);

  useEffect(() => {
    if (!account) return;
    fetch(`/api/wallet?account=${encodeURIComponent(account)}`).then(async (r) => {
      const d = await r.json();
      if (r.ok) setData(d);
      else setError(d.error ?? "Failed to load balance");
    });
  }, [account]);

  if (!account) return <p>No account yet — claim a transfer first.</p>;
  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <>
      <p style={{ color: "#555", margin: 0 }}>{data.accountId}</p>
      <p style={{ fontSize: 40, margin: "8px 0" }}>${data.usdcBalance.toFixed(2)}</p>
      <p style={{ color: "#777", marginTop: 0 }}>USDC on NEAR testnet</p>
      <h2 style={{ fontSize: 18 }}>History</h2>
      {data.history.length === 0 && <p>No transfers yet.</p>}
      {data.history.map((h) => (
        <div key={h.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginTop: 8 }}>
          <strong>Received {h.amountUsdc} USDC</strong>
          <span style={{ color: "#777" }}> · {new Date(h.claimedAt).toLocaleDateString()}</span>
          <p style={{ fontSize: 13, margin: "6px 0 0" }}>
            {h.claimTxUrl && <a href={h.claimTxUrl}>claim tx ↗</a>}{" "}
            {h.payoutTxUrl && <a href={h.payoutTxUrl}>payout tx ↗</a>}{" "}
            <a href={`/r/${h.id}`}>receipt ↗</a>
          </p>
        </div>
      ))}
    </>
  );
}

export default function WalletPage() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem", fontSize: 16 }}>
      <h1 style={{ fontSize: 24 }}>My money</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <WalletInner />
      </Suspense>
    </main>
  );
}
