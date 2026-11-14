/**
 * Agent parsing: turn "send $50 to mum" into a structured SendIntent.
 *
 * With ANTHROPIC_API_KEY set, an LLM does the parsing (handles free-form
 * phrasing). Without it (the DEMO_MODE default), a deterministic parser
 * covers the common shapes so judges need no API keys.
 */

export type SendIntent = {
  kind: "send";
  /** Amount in the sender's chosen unit. */
  amount: number;
  /** Asset the recipient receives. Default: USDC. */
  asset: string;
  /** Who to pay, e.g. "mum" → mum.zermitt.testnet later. */
  recipient: string;
};

export class ParseError extends Error {}

const AMOUNT_RE =
  /(?:\$\s*(\d+(?:\.\d+)?))|(?:(\d+(?:\.\d+)?)\s*(usdt|usdc|usd|dollars?|bucks|near)?)/i;

/** Deterministic fallback parser for demo mode. */
export function parseIntentFallback(text: string): SendIntent {
  const cleaned = text.trim();
  if (!cleaned) throw new ParseError("Empty message — try: send $50 to mum");

  if (!/\b(send|pay|transfer|give|wire)\b/i.test(cleaned)) {
    throw new ParseError(`I can only send money right now. Try: "send $50 to mum"`);
  }

  const amountMatch = cleaned.match(AMOUNT_RE);
  const raw = amountMatch?.[1] ?? amountMatch?.[2];
  if (!raw) throw new ParseError(`I couldn't find an amount. Try: "send $50 to mum"`);
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ParseError(`The amount must be a positive number.`);
  }

  const unit = amountMatch?.[3]?.toLowerCase();
  const asset = unit === "near" ? "NEAR" : unit === "usdt" ? "USDT" : "USDC";

  // The recipient ends at punctuation, end of text, or a purpose ("… to mum for groceries").
  const toMatch = cleaned.match(/\bto\s+([a-z0-9._\- ]+?)(?=\s+for\b|[.!?,]|$)/i);
  if (!toMatch) throw new ParseError(`I couldn't find a recipient. Try: "send $50 to mum"`);
  const recipient = toMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  if (!recipient) throw new ParseError(`I couldn't find a recipient.`);

  return { kind: "send", amount, asset, recipient };
}

/** LLM parser (used when ANTHROPIC_API_KEY is set). */
export async function parseIntentLlm(text: string, apiKey: string): Promise<SendIntent> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 200,
      system:
        "Parse a remittance request into JSON: " +
        `{"amount": number, "asset": "USDC"|"USDT"|"NEAR", "recipient": string}. ` +
        'Default asset is USDC. "recipient" is the name/alias as written, lowercase, spaces→dashes. ' +
        'If the message is not a send request or lacks an amount or recipient, reply {"error": "<short reason>"}. ' +
        "Reply with JSON only.",
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const textOut = data.content.find((c) => c.type === "text")?.text ?? "";
  const parsed = JSON.parse(textOut.replace(/^```(json)?|```$/g, "").trim());
  if (parsed.error) throw new ParseError(parsed.error);
  return { kind: "send", amount: parsed.amount, asset: parsed.asset ?? "USDC", recipient: parsed.recipient };
}

/** Provider-switched parse: nearai (private TEE, with proof) | anthropic | fallback. */
export async function parseIntentWithProof(
  text: string,
  config: {
    agentProvider: "nearai" | "anthropic" | "fallback";
    nearaiApiKey?: string;
    anthropicApiKey?: string;
  }
): Promise<{ intent: SendIntent; proof?: import("./nearai").AgentProof }> {
  if (config.agentProvider === "nearai" && config.nearaiApiKey) {
    const { parseIntentNearai } = await import("./nearai");
    try {
      return await parseIntentNearai(text, config.nearaiApiKey);
    } catch (err) {
      if (err instanceof ParseError) throw err;
      console.warn("NEAR AI parse failed, using fallback parser:", err);
      return { intent: parseIntentFallback(text) };
    }
  }
  if (config.agentProvider === "anthropic" && config.anthropicApiKey) {
    return { intent: await parseIntent(text, config.anthropicApiKey) };
  }
  return { intent: parseIntentFallback(text) };
}

export async function parseIntent(text: string, apiKey?: string): Promise<SendIntent> {
  if (apiKey) {
    try {
      return await parseIntentLlm(text, apiKey);
    } catch (err) {
      if (err instanceof ParseError) throw err;
      // API/network trouble → deterministic fallback keeps the demo alive.
      console.warn("LLM parse failed, using fallback parser:", err);
    }
  }
  return parseIntentFallback(text);
}
