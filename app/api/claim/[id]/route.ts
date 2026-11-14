import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { claimState, getTransfer } from "@/lib/transfers/store";
import { PARENT_ACCOUNT, suggestName } from "@/lib/near/names";
import { ClaimError, executeClaim } from "@/lib/claim/execute";

type Params = { params: Promise<{ id: string }> };

/** A claim runs five testnet transactions in a row (~1 minute). */
export const maxDuration = 300;

/** Claim page data: state + display info. Never returns secrets. */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const record = await getTransfer(id);
  const state = claimState(record);
  if (!record) return NextResponse.json({ state }, { status: 404 });
  const config = loadConfig();
  return NextResponse.json({
    state,
    amountUsd: Number(record.quote.amountOutUsd ?? 0),
    usdcAmount: record.quote.amountOutFormatted,
    senderNote: record.request.intent.recipient,
    senderName: record.senderName ?? null,
    parentAccount: PARENT_ACCOUNT,
    suggestedName: suggestName(record.request.intent.recipient),
    recipientAccountId: record.recipientAccountId,
    mockLogin: config.mockLogin,
    privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || null,
  });
}

/** Execute the claim: {name, publicKey, claimKey}. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { name, publicKey, claimKey } = (await req.json()) as {
      name?: string;
      publicKey?: string;
      claimKey?: string;
    };
    if (!name || !publicKey || !claimKey)
      return NextResponse.json({ error: "Missing name/publicKey/claimKey" }, { status: 400 });
    const result = await executeClaim(id, name, publicKey, claimKey);
    return NextResponse.json({
      accountId: result.accountId,
      usdcAmount: (Number(result.usdcAmount) / 1e6).toFixed(6), // raw 6-decimals → human

      txUrls: result.txUrls,
    });
  } catch (err) {
    if (err instanceof ClaimError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Claim failed — see server logs." }, { status: 500 });
  }
}
