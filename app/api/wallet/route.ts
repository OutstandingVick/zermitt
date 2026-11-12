import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { connectNear, txLink } from "@/lib/near/client";
import { listTransfers } from "@/lib/transfers/store";

/** Wallet data for a claimed account: USDC balance + received history. */
export async function GET(req: Request) {
  const accountId = new URL(req.url).searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "Missing ?account=" }, { status: 400 });
  try {
    const config = loadConfig();
    const near = await connectNear(config);
    const viewer = await near.account(config.testUsdcContract);
    const raw = (await viewer.viewFunction({
      contractId: config.testUsdcContract,
      methodName: "ft_balance_of",
      args: { account_id: accountId },
    })) as string;

    const history = listTransfers()
      .filter((t) => t.recipientAccountId === accountId)
      .map((t) => ({
        id: t.id,
        amountUsdc: t.quote.amountOutFormatted,
        claimedAt: t.createdAt,
        payoutTxUrl: t.transactions.payoutTxHash
          ? txLink(config.networkId, t.transactions.payoutTxHash)
          : null,
        claimTxUrl: t.transactions.claimTxHash
          ? txLink(config.networkId, t.transactions.claimTxHash)
          : null,
      }));

    return NextResponse.json({ accountId, usdcBalance: Number(raw) / 1e6, history });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Balance lookup failed." }, { status: 500 });
  }
}
