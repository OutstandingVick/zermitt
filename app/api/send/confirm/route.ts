import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import type { SendIntent } from "@/lib/agent/parse";
import type { SendQuote } from "@/lib/intents/quote";
import { executeSend } from "@/lib/send/execute";
import { allowRate } from "@/lib/transfers/store";

/** Funding a claim link waits on a testnet transaction. */
export const maxDuration = 120;

/** Public deploys spend the relayer's testnet NEAR (~1.6 per send): cap it. */
const PER_IP_PER_HOUR = Number(process.env.SEND_LIMIT_PER_IP_PER_HOUR ?? 5);
const GLOBAL_PER_DAY = Number(process.env.SEND_LIMIT_PER_DAY ?? 40);

export async function POST(req: Request) {
  try {
    const { text, intent, quote, agentProof, senderName } = (await req.json()) as {
      text: string;
      intent: SendIntent;
      quote: SendQuote;
      agentProof?: import("@/lib/agent/nearai").AgentProof;
      senderName?: string;
    };
    if (!text || !intent || !quote)
      return NextResponse.json({ error: "Missing text/intent/quote" }, { status: 400 });

    const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
    if (!(await allowRate(`send:ip:${ip}`, PER_IP_PER_HOUR, 3600)) || !(await allowRate("send:all", GLOBAL_PER_DAY, 86400)))
      return NextResponse.json({ error: "Demo send limit reached. Try again in a while, or verify an existing receipt." }, { status: 429 });

    const config = loadConfig();
    const result = await executeSend(text, intent, quote, config, agentProof, senderName, new URL(req.url).origin);
    return NextResponse.json({
      claimLink: result.claimLink,
      linkFundTxUrl: result.linkFundTxUrl,
      swapExecution: result.swapExecution,
      swapNote: result.swapNote,
      transferId: result.transfer.id,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
