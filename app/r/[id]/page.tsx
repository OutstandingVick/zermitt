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

const box: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 };

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [found, setFound] = useState<{ receipt: OnChainReceipt; contract: string } | "loading" | "pending">("loading");
  const [verify, setVerify] = useState<"idle" | "ok" | "bad">("idle");
  const [sigCheck, setSigCheck] = useState<"idle" | "ok" | "bad" | "unavailable">("idle");

  useEffect(() => {
    fetchReceipt(id)
      .then((r) => setFound(r ?? "pending"))
      .catch(() => setFound("pending"));
  }, [id]);

  async function runSigCheck() {
    // Check the TEE response signature in the browser: fetch the signed text
    // and signature kept by the app, recover the ECDSA signer, and compare
    // with the signing key committed to on-chain.
    try {
      const res = await fetch(`/api/receipt-proof/${id}`);
      if (!res.ok) return setSigCheck("unavailable");
      const p = (await res.json()) as { signedText: string; signature: string; signingKey: string };
      const { verifyMessage } = await import("ethers");
      const ok =
        found !== "loading" &&
        found !== "pending" &&
        verifyMessage(p.signedText, p.signature).toLowerCase() === p.signingKey.toLowerCase() &&
        p.signingKey.toLowerCase() === (found.receipt.meta.signing_key ?? "").toLowerCase();
      setSigCheck(ok ? "ok" : "bad");
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
  if (found === "loading") body = <p>Reading from the contract…</p>;
  else if (found === "pending")
    body = (
      <p>
        ⏳ No on-chain receipt for this transfer yet. Receipts are recorded when
        the transfer is claimed — this one is pending (or the id is unknown).
      </p>
    );
  else {
    const r = found.receipt;
    const contract = found.contract;
    const amountUsd = Number(r.meta.amount_usdc) / 1e6;
    const cmp = feeComparison(amountUsd, Number(r.meta.fee_usd), 25);
    body = (
      <>
        <div style={box}>
          <p style={{ margin: 0, fontSize: 22 }}>
            ${amountUsd.toFixed(2)} → <code>{r.meta.recipient_account}</code>
          </p>
          <p style={{ color: "#555" }}>
            Sent to &ldquo;{r.meta.sender_label}&rdquo; · {r.meta.route_summary}
            <br />
            Fee ${Number(r.meta.fee_usd).toFixed(4)} ·{" "}
            {r.meta.swap_mode === "mocked" ? (
              <strong>🧪 swap mocked (demo)</strong>
            ) : (
              <strong>live swap</strong>
            )}{" "}
            · {new Date(r.meta.timestamp).toLocaleString()}
          </p>
          <p style={{ fontSize: 14 }}>
            {r.meta.tx_hashes.map((h) => (
              <span key={h}>
                <a href={`https://testnet.nearblocks.io/txns/${h}`}>{h.slice(0, 8)}… ↗</a>{" "}
              </span>
            ))}
          </p>
        </div>

        {r.meta.agent_provider === "nearai" ? (
          <div style={{ ...box, background: "#f3f7ff" }}>
            <p style={{ margin: 0 }}>
              🔒 <strong>Ran privately in a TEE</strong> (NEAR AI Cloud)
            </p>
            <p style={{ fontSize: 13, color: "#555", wordBreak: "break-all" }}>
              Model: <code>{r.meta.model}</code>
              <br />
              Attestation hash: <code>{r.meta.attestation_hash}</code>
              <br />
              Signing key: <code>{r.meta.signing_key}</code> ·{" "}
              <a href={`/api/receipt-proof/${id}`}>raw attestation report ↗</a>
            </p>
            <button onClick={runSigCheck} style={{ width: "100%", padding: 10, borderRadius: 8 }}>
              Check response signature
            </button>
            {sigCheck === "ok" && <p style={{ color: "#0a7d2e" }}>✅ Signature recovers to the attested signing key.</p>}
            {sigCheck === "bad" && <p style={{ color: "#b00020" }}>❌ Signature does not match the attested key.</p>}
            {sigCheck === "unavailable" && <p style={{ color: "#777" }}>Signature material not available from this server.</p>}
          </div>
        ) : (
          <p style={{ color: "#777", fontSize: 14 }}>Agent: standard (not private)</p>
        )}

        <div style={box}>
          <p style={{ margin: 0 }}>{cmp.sentence}</p>
          <p style={{ fontSize: 12, color: "#777" }}>Comparison figures: {COMPARISON.source} — estimates.</p>
        </div>

        <div style={box}>
          <p style={{ fontSize: 13, color: "#555", wordBreak: "break-all", margin: 0 }}>
            On-chain hash: <code>{r.receipt_hash}</code>
            <br />
            Contract: <code>{contract}</code> · recorded{" "}
            {new Date(r.recorded_at_ms).toLocaleString()}
          </p>
          <button
            onClick={() => runVerify(r)}
            style={{ width: "100%", padding: 12, borderRadius: 8, marginTop: 10, fontSize: 16 }}
          >
            Verify in this browser
          </button>
          {verify === "ok" && <p style={{ color: "#0a7d2e" }}>✅ Verified — the recomputed sha256 matches the on-chain hash.</p>}
          {verify === "bad" && <p style={{ color: "#b00020" }}>❌ Mismatch — the data does not match the on-chain hash.</p>}
        </div>
      </>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem", fontSize: 16 }}>
      <h1 style={{ fontSize: 24 }}>Receipt</h1>
      <p style={{ color: "#777", fontSize: 13 }}>Transfer {id}</p>
      {body}
    </main>
  );
}
