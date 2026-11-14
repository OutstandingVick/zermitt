import { NextResponse } from "next/server";
import { loadTeeBundle } from "@/lib/receipts/bundle-source";

/**
 * TEE signature bundle for a receipt: the signed text, ECDSA signature,
 * nonce and raw attestation report. Comes from the app's local data, or
 * from the committed fixture on a fresh clone. The browser checks it
 * against the on-chain receipt; this route is not trusted for the result.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await loadTeeBundle(id);
  if (!found) return NextResponse.json({ error: "No TEE bundle for this transfer." }, { status: 404 });
  return NextResponse.json({ source: found.source, bundle: found.bundle });
}
