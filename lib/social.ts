import { log } from "./store";
import type { Trade } from "./types";

/** Grok writes a short alert. Falls back to a template. */
export async function composeAlert(trade: Trade): Promise<string> {
  const template = `VoiceBet agent bought ${trade.contracts} ${trade.outcome.toUpperCase()} on "${trade.eventTitle}" at ${Math.round(trade.price * 100)}c for ${trade.costUsdc.toFixed(2)} USDC. Receipt on Solana. #UBCHackathon`;
  const key = process.env.XAI_API_KEY;
  if (!key) return template;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-3-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "Write one punchy tweet under 240 characters about a prediction market trade an AI agent just made. No financial advice. End with #UBCHackathon." },
          { role: "user", content: JSON.stringify({ market: trade.eventTitle, contract: trade.label, side: trade.outcome, price: trade.price, usdc: trade.costUsdc }) },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
    return text && text.length <= 280 ? text : template;
  } catch {
    return template;
  }
}

/** Posts to X when a user token is set. Otherwise logs the alert in the feed. */
export async function sendAlert(trade: Trade) {
  const text = await composeAlert(trade);
  const token = process.env.X_USER_ACCESS_TOKEN;
  if (!token) {
    log("alert", `Grok alert ready: ${text}`);
    return { posted: false, text };
  }
  try {
    const res = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.detail || `X ${res.status}`);
    const link = `https://x.com/i/web/status/${json.data?.id}`;
    log("alert", `Posted to X: ${text}`, link);
    return { posted: true, text, link };
  } catch (e) {
    log("error", `X post failed: ${(e as Error).message}`);
    return { posted: false, text };
  }
}
