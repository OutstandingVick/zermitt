import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTransfer } from "@/lib/transfers/store";

/**
 * Extra TEE evidence for a receipt (beyond the on-chain fields): the signed
 * text, ECDSA signature, and the raw attestation report captured at parse
 * time. Served from the app's own store — the on-chain receipt hash commits
 * to the attestation hash and signing key, and the browser checks the
 * signature against them.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getTransfer(id)?.agentProof;
  if (!proof) return NextResponse.json({ error: "No agent proof for this transfer." }, { status: 404 });
  let report: unknown = null;
  try {
    report = JSON.parse(
      readFileSync(join(process.cwd(), "data", "attestations", `${proof.chatId}.json`), "utf8")
    );
  } catch {}
  return NextResponse.json({
    signedText: proof.signedText,
    signature: proof.signature,
    signingKey: proof.signingKey,
    model: proof.model,
    attestationHash: proof.attestationHash,
    verifiedAtParse: proof.verified,
    report,
  });
}
