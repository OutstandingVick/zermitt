"use client";

/**
 * Public receipt page (design: receipt.html). Reads the receipt FROM THE
 * CONTRACT via a keyless RPC view call — not from the app's database — and
 * verifies the hash in the browser on load. The "Verified on NEAR" badge
 * only appears once that check has passed.
 *
 * The sender's name and the request text are not stored on-chain, so this
 * page shows what the contract holds: recipient alias, account, amount,
 * fee, route, swap mode and transactions.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { canonicalJson, sha256Hex, type ReceiptMeta } from "@/lib/receipts/hash";
import { feeComparison, COMPARISON } from "@/lib/receipts/comparison";
import { checkTeeBundle, type TeeBundle, type TeeCheck } from "@/lib/receipts/tee";
import { AppShell, Button, Icon, Label, Row, Skeleton, TopBar, cents2, shortHash, timeAgo, titleCase } from "../../ui";

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

const TX_NAMES = ["Link funded", "Account created", "Link claimed", "USDC enabled", "USDC sent", "Swap"];

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [found, setFound] = useState<{ receipt: OnChainReceipt; contract: string } | "loading" | "pending">("loading");
  const [verify, setVerify] = useState<"checking" | "ok" | "bad">("checking");
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [sigCheck, setSigCheck] = useState<"idle" | "checking" | "ok" | "bad" | "unavailable">("idle");
  const [sigDetail, setSigDetail] = useState<{ source: string; check: TeeCheck } | null>(null);
  const [shared, setShared] = useState(false);

  const runVerify = useCallback(async (r: OnChainReceipt) => {
    // Recompute sha256 over the canonical JSON of the on-chain metadata
    // and compare with the on-chain hash.
    setVerify("checking");
    const recomputed = await sha256Hex(canonicalJson(r.meta));
    setVerify(recomputed === r.receipt_hash ? "ok" : "bad");
    setVerifiedAt(Date.now());
  }, []);

  useEffect(() => {
    fetchReceipt(id)
      .then((r) => {
        setFound(r ?? "pending");
        if (r) void runVerify(r.receipt);
      })
      .catch(() => setFound("pending"));
  }, [id, runVerify]);

  async function runSigCheck() {
    // Check the TEE bundle in the browser against the ON-CHAIN receipt:
    // signature recovery, nonce binding, report hash == attestation_hash,
    // and signing key/model == on-chain fields. The server only supplies data.
    if (found === "loading" || found === "pending") return;
    setSigCheck("checking");
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

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "Zermitt receipt", url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {}
  }

  if (found === "loading")
    return (
      <AppShell>
        <TopBar title="Receipt" back="/app" />
        <div className="z-paper" style={{ marginTop: 22 }} aria-busy="true">
          <p className="z-xs" style={{ margin: 0, color: "var(--z-ink-2)" }}>Reading the receipt from NEAR…</p>
          <div style={{ height: 40, width: "55%", marginTop: 14, borderRadius: 12, background: "rgba(7,16,19,.08)" }} />
          <div style={{ height: 13, width: "75%", marginTop: 10, borderRadius: 8, background: "rgba(7,16,19,.08)" }} />
        </div>
        <Skeleton h={90} style={{ marginTop: 14 }} />
      </AppShell>
    );

  if (found === "pending")
    return (
      <AppShell>
        <TopBar title="Receipt" back="/app" />
        <div className="z-center" style={{ marginTop: 56 }}>
          <span className="z-badge z-badge-lemon">Waiting for claim</span>
          <h2 className="z-u" style={{ fontSize: 28, lineHeight: 1.15, margin: "16px 0 0" }}>No receipt on NEAR yet</h2>
          <p className="z-mut" style={{ margin: "12px 12px 0" }}>
            Receipts are written when the money is claimed. This transfer hasn&apos;t been claimed yet, or the link is wrong.
          </p>
        </div>
        <div className="z-spacer" />
        <Button variant="ghost" href="/app">Back to home</Button>
      </AppShell>
    );

  const r = found.receipt;
  const m = r.meta;
  const amount = Number(m.amount_usdc) / 1e6;
  const fee = Number(m.fee_usd);
  const cmp = feeComparison(Number(cents2(amount)), fee);
  const route = m.route_summary.split(" via ")[0].replace("→", " → ");
  const tee = m.agent_provider === "nearai";
  const payout = m.tx_hashes[4] ?? m.tx_hashes[m.tx_hashes.length - 1];

  return (
    <AppShell>
      <TopBar title="Receipt" back="/app" />

      <article className="z-paper" style={{ marginTop: 22 }} aria-label="Receipt">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span className="z-lab">To {titleCase(m.sender_label)}</span>
          {verify === "ok" ? (
            <span className="z-badge z-badge-blue"><Icon name="check" size={12} stroke={3} />Verified on NEAR</span>
          ) : verify === "bad" ? (
            <span className="z-badge z-badge-orange">Hash mismatch</span>
          ) : (
            <span className="z-badge z-badge-muted">Checking…</span>
          )}
        </div>
        <p className="z-u" style={{ fontSize: 40, lineHeight: 1.05, margin: "14px 0 0" }}>${cents2(amount)}</p>
        <p className="z-sm" style={{ margin: "2px 0 0", color: "var(--z-ink-2)", overflowWrap: "anywhere" }}>
          Claimed into {m.recipient_account} · {timeAgo(r.recorded_at_ms)}
        </p>
        <hr className="z-dash" />
        <dl style={{ margin: 0 }}>
          <Row label="Route">{route}</Row>
          <Row label="Fee">${fee.toFixed(fee < 0.01 ? 4 : 2)}</Row>
          <Row label="Swap">{m.swap_mode === "mocked" ? "Simulated (testnet)" : "Live"}</Row>
          {payout && (
            <Row label="Transaction">
              <a href={`https://testnet.nearblocks.io/txns/${payout}`} target="_blank" rel="noreferrer">{shortHash(payout)} ↗</a>
            </Row>
          )}
        </dl>
        {m.tx_hashes.length > 1 && (
          <details className="z-details" style={{ marginTop: 6 }}>
            <summary>All {m.tx_hashes.length} transactions</summary>
            <dl style={{ margin: 0 }}>
              {m.tx_hashes.map((h, i) => (
                <Row key={h} label={TX_NAMES[i] ?? `Tx ${i + 1}`}>
                  <a href={`https://testnet.nearblocks.io/txns/${h}`} target="_blank" rel="noreferrer">{shortHash(h)} ↗</a>
                </Row>
              ))}
            </dl>
          </details>
        )}
      </article>

      {tee ? (
        <section className="z-card z-pad" style={{ marginTop: 14 }} aria-label="Private agent">
          <div className="z-row-flex">
            <span style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(5,142,217,.18)", color: "var(--z-blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="shield" size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700 }}>Ran privately in a TEE</div>
              <div className="z-mut z-xs">NEAR AI Cloud · {(m.model ?? "").split("/").pop()}</div>
            </div>
          </div>
          <dl className="z-xs z-tight" style={{ margin: "10px 0 0" }}>
            <Row label="Attestation">{shortHash(m.attestation_hash ?? "")}</Row>
            <Row label="Signed by">{shortHash(m.signing_key ?? "", 6, 4)}</Row>
          </dl>
          <button type="button" className="z-btn z-btn-ghost" style={{ marginTop: 12, minHeight: 44 }} onClick={runSigCheck} disabled={sigCheck === "checking"}>
            {sigCheck === "checking" ? <><span className="z-spin" aria-hidden="true" /> Checking…</> : "Check the TEE signature"}
          </button>
          <div aria-live="polite">
            {sigCheck === "ok" && <p className="z-blue z-sm" style={{ margin: "10px 0 0" }}>Signature recovers to the attested key, and the report matches the receipt.</p>}
            {sigCheck === "bad" && <p className="z-alert" style={{ marginTop: 10 }}>The TEE proof does not match this receipt.</p>}
            {sigCheck === "unavailable" && <p className="z-mut z-sm" style={{ margin: "10px 0 0" }}>No signature bundle on this server for this receipt.</p>}
            {sigDetail && (
              <ul className="z-xs" style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 4 }}>
                {[
                  [sigDetail.check.signatureRecovers, "Signature recovers to signing key"],
                  [sigDetail.check.hashesMatchSignedText, "Request and response hashes match"],
                  [sigDetail.check.nonceBound, "Attestation bound to our nonce"],
                  [sigDetail.check.reportHashMatchesChain, "Report hash matches the receipt"],
                  [sigDetail.check.keyAndModelMatchChain, "Key and model match the receipt"],
                ].map(([ok, label]) => (
                  <li key={label as string} className={ok ? "z-blue" : "z-orange-t"}>{ok ? "Pass" : "Fail"} · {label as string}</li>
                ))}
                <li className="z-mut">Bundle: {sigDetail.source === "fixture" ? "committed fixture" : "this server"} · <a href={`/api/receipt-proof/${id}`}>raw ↗</a></li>
              </ul>
            )}
          </div>
        </section>
      ) : (
        <p className="z-mut z-sm" style={{ margin: "14px 4px 0" }}>Agent: standard (not private)</p>
      )}

      <div className="z-card z-pad" style={{ marginTop: 14 }}>
        <Label>Versus a bank</Label>
        <p className="z-sm" style={{ margin: "8px 0 0" }}>{cmp.sentence}</p>
        <p className="z-mut z-xs" style={{ margin: "6px 0 0" }}>{COMPARISON.source}. Estimates.</p>
      </div>

      <div className="z-spacer" style={{ minHeight: 20 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button variant="lemon" onClick={() => void runVerify(r)} disabled={verify === "checking"}>Verify in this browser</Button>
        <p className="z-xs z-center" style={{ margin: 0 }} aria-live="polite">
          {verify === "ok" && verifiedAt && <span className="z-blue">Recomputed sha256 matches the on-chain hash.</span>}
          {verify === "bad" && <span className="z-orange-t">The data does not match the on-chain hash.</span>}
        </p>
        <Button variant="ghost" onClick={share}>{shared ? "Link copied" : "Share receipt"}</Button>
        <p className="z-mut z-xs z-center" style={{ margin: "4px 0 0", overflowWrap: "anywhere" }}>
          {found.contract} · hash <span className="z-mono">{shortHash(r.receipt_hash, 8, 8)}</span>
        </p>
      </div>
    </AppShell>
  );
}
