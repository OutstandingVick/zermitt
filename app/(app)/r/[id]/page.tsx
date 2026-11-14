"use client";

/**
 * Public receipt page. Reads the receipt FROM THE CONTRACT
 * (receipts.zermitt.testnet) via a keyless RPC view call — not from the
 * app's database — and verifies the hash in the browser.
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { canonicalJson, sha256Hex, type ReceiptMeta } from "@/lib/receipts/hash";
import { feeComparison, COMPARISON } from "@/lib/receipts/comparison";
import { checkTeeBundle, type TeeBundle, type TeeCheck } from "@/lib/receipts/tee";

const CONTRACTS = [
  process.env.NEXT_PUBLIC_RECEIPTS_CONTRACT ?? "receipts-v2.zermitt.testnet",
  "receipts.zermitt.testnet", // v1 — pre-TEE receipts
];
const RPC = "https://rpc.testnet.near.org";

type OnChainReceipt = {
  transfer_id: string;
  receipt_hash: string;
  meta: ReceiptMeta;
  recorded_at_ms: number;
};

async function fetchReceipt(id: string): Promise<{ receipt: OnChainReceipt; contract: string } | null> {
  for (const contract of CONTRACTS) {
    const r = await fetchReceiptFrom(contract, id).catch(() => null);
    if (r) return { receipt: r, contract };
  }
  return null;
}

async function fetchReceiptFrom(contract: string, id: string): Promise<OnChainReceipt | null> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contract,
        method_name: "get_receipt",
        args_base64: btoa(JSON.stringify({ transfer_id: id })),
      },
    }),
  });
  const data = (await res.json()) as { result?: { result: number[] } };
  if (!data.result) throw new Error("RPC query failed");
  return JSON.parse(new TextDecoder().decode(new Uint8Array(data.result.result)));
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [found, setFound] = useState<{ receipt: OnChainReceipt; contract: string } | "loading" | "pending">("loading");
  const [verify, setVerify] = useState<"idle" | "ok" | "bad">("idle");
  const [sigCheck, setSigCheck] = useState<"idle" | "ok" | "bad" | "unavailable">("idle");
  const [sigDetail, setSigDetail] = useState<{ source: string; check: TeeCheck } | null>(null);

  useEffect(() => {
    fetchReceipt(id)
      .then((r) => setFound(r ?? "pending"))
      .catch(() => setFound("pending"));
  }, [id]);

  async function runSigCheck() {
    // Check the TEE bundle in the browser against the ON-CHAIN receipt:
    // signature recovery, nonce binding, report hash == attestation_hash,
    // and signing key/model == on-chain fields. The server only supplies data.
    if (found === "loading" || found === "pending") return;
    try {
      const res = await fetch(`/api/receipt-proof/${id}`);
      if (!res.ok) return setSigCheck("unavailable");
      const { source, bundle } = (await res.json()) as { source: string; bundle: TeeBundle };
      const check = await checkTeeBundle(bundle, found.receipt.meta);
      setSigDetail({ source, check });
      setSigCheck(check.ok ? "ok" : "bad");
    } catch {
      setSigCheck("bad");
    }
  }

  async function runVerify(r: OnChainReceipt) {
    // Recompute sha256 over the canonical JSON of the DISPLAYED on-chain
    // metadata and compare with the on-chain hash.
    const recomputed = await sha256Hex(canonicalJson(r.meta));
    setVerify(recomputed === r.receipt_hash ? "ok" : "bad");
  }

  let body: React.ReactNode;
  if (found === "loading")
    body = (
      <div className="card stack-sm" aria-busy="true">
        <p className="small muted" style={{ margin: 0 }}>Reading the receipt from NEAR…</p>
        <div className="skeleton" style={{ height: 40, width: "50%" }} />
        <div className="skeleton" style={{ height: 14, width: "80%" }} />
      </div>
    );
  else if (found === "pending")
    body = (
      <div className="card stack-sm center">
        <span className="badge badge-warn">Pending</span>
        <h2>No receipt on NEAR yet</h2>
        <p className="lead">Receipts are written when the money is claimed. This transfer hasn&rsquo;t been claimed yet, or the link is wrong.</p>
      </div>
    );
  else {
    const r = found.receipt;
    const contract = found.contract;
    const amountUsd = Number(r.meta.amount_usdc) / 1e6;
    const cmp = feeComparison(amountUsd, Number(r.meta.fee_usd));
    body = (
      <>
        <div className="card stack">
          <div className="stack-sm">
            <div className="row">
              <span className="badge grow" style={{ flex: "none" }}>On NEAR</span>
              {r.meta.swap_mode === "mocked" ? (
                <span className="badge badge-warn">🧪 Swap simulated (demo)</span>
              ) : (
                <span className="badge">Live swap</span>
              )}
            </div>
            <p className="amount">${amountUsd.toFixed(2)}</p>
            <p className="small muted" style={{ margin: 0 }}>
              to &ldquo;{r.meta.sender_label}&rdquo; · <code>{r.meta.recipient_account}</code>
            </p>
          </div>
          <dl style={{ margin: 0 }}>
            <div className="kv"><dt>Fee</dt><dd>${Number(r.meta.fee_usd).toFixed(4)}</dd></div>
            <div className="kv"><dt>Sent</dt><dd>{new Date(r.meta.timestamp).toLocaleString()}</dd></div>
            <div className="kv"><dt>Route</dt><dd className="small">{r.meta.route_summary}</dd></div>
          </dl>
          <div className="stack-sm">
            <div className="label">Transactions</div>
            <div className="links">
              {r.meta.tx_hashes.map((h) => (
                <a key={h} href={`https://testnet.nearblocks.io/txns/${h}`} target="_blank" rel="noreferrer">
                  {h.slice(0, 8)}… ↗
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="card card-soft stack-sm">
          <p style={{ margin: 0 }}>{cmp.sentence}</p>
          <p className="tiny muted" style={{ margin: 0 }}>Comparison: {COMPARISON.source}. Estimates.</p>
        </div>

        {r.meta.agent_provider === "nearai" ? (
          <div className="card stack-sm">
            <p style={{ margin: 0 }}>🔒 <strong>Ran privately in a TEE</strong> <span className="muted small">(NEAR AI Cloud)</span></p>
            <dl style={{ margin: 0 }}>
              <div className="kv"><dt>Model</dt><dd><code>{r.meta.model}</code></dd></div>
              <div className="kv"><dt>Signing key</dt><dd><code>{r.meta.signing_key}</code></dd></div>
              <div className="kv"><dt>Attestation</dt><dd><code>{r.meta.attestation_hash?.slice(0, 16)}…</code></dd></div>
            </dl>
            <button className="btn btn-secondary btn-block" onClick={runSigCheck}>Check response signature</button>
            {sigCheck === "ok" && <p className="alert alert-ok">✅ Signature recovers to the attested signing key.</p>}
            {sigCheck === "bad" && <p className="alert alert-error">❌ TEE proof does not match this receipt.</p>}
            {sigCheck === "unavailable" && <p className="alert alert-warn">No signature bundle on this server for this receipt.</p>}
            {sigDetail && (
              <ul className="checks tiny">
                <li>{sigDetail.check.signatureRecovers ? "✅" : "❌"} signature recovers to signing key</li>
                <li>{sigDetail.check.hashesMatchSignedText ? "✅" : "❌"} request/response hashes match signed text</li>
                <li>{sigDetail.check.nonceBound ? "✅" : "❌"} attestation bound to request nonce</li>
                <li>{sigDetail.check.reportHashMatchesChain ? "✅" : "❌"} sha256(report) = on-chain attestation_hash</li>
                <li>{sigDetail.check.keyAndModelMatchChain ? "✅" : "❌"} signing key and model = on-chain fields</li>
                <li className="muted">bundle: {sigDetail.source === "fixture" ? "committed fixture" : "this server"} · <a href={`/api/receipt-proof/${id}`}>raw ↗</a></li>
              </ul>
            )}
          </div>
        ) : (
          <p className="small muted">Agent: standard (not private)</p>
        )}

        <div className="card stack-sm">
          <div className="label">Verify</div>
          <dl style={{ margin: 0 }}>
            <div className="kv"><dt>Contract</dt><dd><code>{contract}</code></dd></div>
            <div className="kv"><dt>Recorded</dt><dd>{new Date(r.recorded_at_ms).toLocaleString()}</dd></div>
          </dl>
          <p className="tiny muted" style={{ margin: 0 }}>On-chain hash <code>{r.receipt_hash}</code></p>
          <button className="btn btn-primary btn-block" onClick={() => runVerify(r)}>Verify in this browser</button>
          {verify === "ok" && <p className="alert alert-ok">✅ Verified: the recomputed sha256 matches the on-chain hash.</p>}
          {verify === "bad" && <p className="alert alert-error">❌ Mismatch: the data does not match the on-chain hash.</p>}
        </div>
      </>
    );
  }

  return (
    <main className="container stack">
      <div className="stack-sm">
        <h1>Receipt</h1>
        <p className="tiny muted" style={{ margin: 0 }}>Transfer <code>{id}</code></p>
      </div>
      {body}
    </main>
  );
}
