import type { Intent } from "./types";

const FILLER = new Set(
  "put place bet buy stake wager on the a an of for in at to my me please usdc usd dollars dollar bucks with market markets odds price if when drops drop falls fall goes go below under above over rises rise hits hit cents cent percent yes no that this and agent voicebet hey ok okay i want would like".split(" ")
);

function toProb(n: number) {
  if (n > 1) return Math.min(n / 100, 0.99);
  return n;
}

/** Fast local parser. Used when Grok is not configured or fails. */
export function parseWithRules(raw: string): Intent {
  const text = raw.toLowerCase().trim();
  const base: Intent = { action: "unknown", raw, source: "rules" };

  if (/\b(kill switch|stop( all)?( trading)?|pause|halt|freeze)\b/.test(text) && !/\bbet\b/.test(text)) return { ...base, action: "stop" };
  if (/\b(resume|unpause|start trading|turn (it )?back on)\b/.test(text)) return { ...base, action: "resume" };
  if (/\b(recap|summary|summarize|daily report|how did i do)\b/.test(text)) return { ...base, action: "recap" };
  if (/\b(status|balance|how am i doing|budget|left today|positions?)\b/.test(text) && !/\b(put|bet|buy|stake)\b/.test(text))
    return { ...base, action: "status" };

  const amountMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:usdc|usd|dollars?|bucks|\$)/) || text.match(/\$\s*(\d+(?:\.\d+)?)/) || text.match(/\b(?:put|bet|stake|buy|wager)\s+(\d+(?:\.\d+)?)/);
  const amountUsdc = amountMatch ? parseFloat(amountMatch[1]) : undefined;

  const below = text.match(/(?:below|under|drops? (?:to|below)?|falls? (?:to|below)?|less than)\s*(\d+(?:\.\d+)?)\s*(?:%|percent|cents?|c\b)?/);
  const above = text.match(/(?:above|over|rises? (?:to|above)?|more than|hits?)\s*(\d+(?:\.\d+)?)\s*(?:%|percent|cents?|c\b)?/);
  const maxP = text.match(/(?:max(?:imum)?|at most|no more than|up to)\s*(?:price\s*)?(\d+(?:\.\d+)?)\s*(?:%|percent|cents?|c\b)/);

  const outcome: "yes" | "no" = /\bon no\b|\bno side\b|\bagainst\b|\bbuy no\b|\bbet no\b|\bwon'?t\b|\bwill not\b/.test(text) ? "no" : "yes";

  const isWatch = !!(below || above) && /\bif\b|\bwhen\b|\bonce\b/.test(text);

  const query = text
    .replace(/(\d+(?:\.\d+)?)\s*(%|percent|cents?|usdc|usd|dollars?|bucks)?/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .join(" ")
    .trim();

  const tradeVerb = /\b(bet|put|buy|stake|wager)\b/.test(text);
  const question = /\?\s*$/.test(text) || /^(what|why|how|which|should|is|are|can|could|would|do|does|tell|explain|analy[sz]e|compare|give me|show me|any|hey|hi|hello)\b/.test(text);
  if (question && !(amountUsdc && tradeVerb)) return { ...base, action: "ask", query };

  if (amountUsdc || tradeVerb) {
    return {
      ...base,
      action: isWatch ? "watch" : "bet",
      amountUsdc: amountUsdc ?? 10,
      outcome,
      query,
      triggerBelow: below ? toProb(parseFloat(below[1])) : undefined,
      triggerAbove: !below && above ? toProb(parseFloat(above[1])) : undefined,
      maxPrice: maxP ? toProb(parseFloat(maxP[1])) : undefined,
    };
  }
  return base;
}

const SYSTEM = `You turn a spoken trading command into JSON for a prediction market agent.
Return ONLY JSON with keys:
action: one of bet, watch, status, stop, resume, recap, ask, unknown
Use "ask" for questions, opinions, analysis or chat that should NOT place a trade (e.g. "what do you think about the Fed market", "which crypto market looks cheap", "explain this").
query: short search words for the market (e.g. "fed rate cut", "bitcoin 150k"), omit for non trade actions
outcome: "yes" or "no" (default yes)
amountUsdc: number
maxPrice: number 0..1 (optional)
triggerBelow: number 0..1 (optional, for "if odds drop below X")
triggerAbove: number 0..1 (optional)
Use action "watch" when the user gives a condition like if or when. Convert 40 or 40% or 40 cents to 0.4.`;

export async function parseIntent(raw: string): Promise<Intent> {
  const key = process.env.XAI_API_KEY;
  if (!key) return parseWithRules(raw);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-3-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: raw },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`xAI ${res.status}`);
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "{}";
    const json = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
    const fallback = parseWithRules(raw);
    return {
      action: json.action ?? fallback.action,
      query: json.query ?? fallback.query,
      outcome: json.outcome === "no" ? "no" : "yes",
      amountUsdc: typeof json.amountUsdc === "number" ? json.amountUsdc : fallback.amountUsdc,
      maxPrice: typeof json.maxPrice === "number" ? json.maxPrice : fallback.maxPrice,
      triggerBelow: typeof json.triggerBelow === "number" ? json.triggerBelow : fallback.triggerBelow,
      triggerAbove: typeof json.triggerAbove === "number" ? json.triggerAbove : fallback.triggerAbove,
      raw,
      source: "grok",
    };
  } catch {
    return parseWithRules(raw);
  }
}
