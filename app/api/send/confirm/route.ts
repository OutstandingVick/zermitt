import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import type { SendIntent } from "@/lib/agent/parse";
import type { SendQuote } from "@/lib/intents/quote";
import { executeSend } from "@/lib/send/execute";

export async function POST(req: Request) {
  try {
    const { text, intent, quote } = (await req.json()) as {
      text: string;
      intent: SendIntent;
      quote: SendQuote;
    };
    if (!text || !intent || !quote)
      return NextResponse.json({ error: "Missing text/intent/quote" }, { status: 400 });

    const config = loadConfig();
    const result = await executeSend(text, intent, quote, config);
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
