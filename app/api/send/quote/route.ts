import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { ParseError, parseIntent } from "@/lib/agent/parse";
import { getSendQuote } from "@/lib/intents/quote";

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const config = loadConfig();
    const intent = await parseIntent(text, config.anthropicApiKey);
    // The sender spends a stablecoin; quotes route to USDC on NEAR.
    const quote = await getSendQuote(intent.asset === "NEAR" ? "NEAR" : "USDT", intent.amount, config.oneClickJwt);
    return NextResponse.json({ intent, quote, demoMode: config.demoMode });
  } catch (err) {
    if (err instanceof ParseError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error(err);
    return NextResponse.json({ error: "Quote failed — see server logs." }, { status: 500 });
  }
}
