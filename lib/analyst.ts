import { listMarkets, priceFor } from "./gemini";
import { spentToday } from "./policy";
import { state } from "./store";
import type { Contract } from "./types";
import { coinPrices, type CoinPrice } from "./crypto";

export type Turn = { role: "user" | "agent"; text: string };

const STOP = new Set("what is the a an do you think about should i on of for in to my me it and or how why will tell analyze analyse explain market markets odds price please can could would".split(" "));

function related(question: string, markets: Contract[], n = 12): Contract[] {
  const words = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const scored = markets.map((m) => {
    const hay = `${m.eventTitle} ${m.label} ${m.category}`.toLowerCase();
    return { m, score: words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0) };
  });
  const hits = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.m);
  return (hits.length ? hits : markets).slice(0, n);
}

const SYSTEM = `You are VoiceBet, a friendly voice assistant for a prediction market trading agent.
Your answer will be read aloud, so:
- Speak in plain short sentences. 2 to 5 sentences. Under 90 words.
- No markdown, no lists, no emojis, no URLs.
- Say prices as cents, for example 43 cents. A price of 43 cents means the market thinks the chance is about 43 percent.
coin_prices in DATA are live spot prices in US dollars with the 24 hour change. When the user asks about a coin like Solana or Bitcoin, answer with that price and the change, say it is spot price, and mention any related prediction market if one exists. Say dollars for coin prices and cents for market prices.
Use only the market data, coin prices and account data given to you. If the data does not cover the question, say so briefly.
You can explain markets, compare options, give the user's status and suggest what they could say next, for example "say: bet 10 USDC on yes for the Fed cut".
Never promise profit. Give balanced views and mention risk when you suggest a trade. This is testnet money.`;

function fallbackAnswer(question: string, ms: Contract[], live: boolean, coins: CoinPrice[] = []) {
  if (coins.length) {
    const c = coins.map((x) => `${x.coin} is $${x.usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}${x.change24hPct == null ? "" : `, ${x.change24hPct >= 0 ? "up" : "down"} ${Math.abs(x.change24hPct)} percent in 24 hours`}`);
    return `${c.join(". ")}. This is the spot price.`;
  }
  const top = ms.slice(0, 3);
  if (!top.length) return "I could not load any markets right now. Try again in a moment.";
  const lines = top.map((m) => `${m.eventTitle}, ${m.label}, trades at ${Math.round(m.yesAsk * 100)} cents for yes`);
  return `Here is what I see${live ? "" : " in demo data"}. ${lines.join(". ")}. A price near 50 cents means the market is unsure. Say bet, an amount and a market to trade.`;
}

/** Answers a free form question with Grok, grounded in live markets and the user's account. */
export async function analyze(question: string, history: Turn[] = []): Promise<{ reply: string; source: "grok" | "rules"; markets: Contract[] }> {
  const { markets, live } = await listMarkets();
  const ms = related(question, markets);
  const coins = await coinPrices(question + " " + history.slice(-2).map((t) => t.text).join(" "));
  const s = state();
  const key = process.env.XAI_API_KEY;
  if (!key) return { reply: fallbackAnswer(question, ms, live, coins), source: "rules", markets: ms };

  const context = {
    data_source: live ? "live Gemini prediction markets" : "demo markets (Gemini API unreachable)",
    coin_prices: coins,
    markets: ms.map((m) => ({
      event: m.eventTitle,
      contract: m.label,
      category: m.category,
      yes_price_cents: Math.round(priceFor(m, "yes") * 100),
      no_price_cents: Math.round(priceFor(m, "no") * 100),
      expiry: m.expiry,
    })),
    account: {
      spent_today_usdc: spentToday(),
      daily_cap_usdc: s.policy.dailyCapUsdc,
      per_bet_max_usdc: s.policy.perBetMaxUsdc,
      trading_paused: s.policy.killSwitch,
      recent_trades: s.trades.slice(0, 5).map((t) => ({ market: t.eventTitle, side: t.outcome, price_cents: Math.round(t.price * 100), usdc: t.costUsdc })),
      active_watch_rules: s.rules.filter((r) => r.active).length,
    },
  };

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-3-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `DATA: ${JSON.stringify(context)}` },
          ...history.slice(-6).map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text.slice(0, 600) })),
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`xAI ${res.status}`);
    const data = await res.json();
    const text: string = (data.choices?.[0]?.message?.content ?? "").replace(/[*#_`>]/g, "").replace(/\s+/g, " ").trim();
    if (!text) throw new Error("empty");
    return { reply: text, source: "grok", markets: ms };
  } catch {
    return { reply: fallbackAnswer(question, ms, live, coins), source: "rules", markets: ms };
  }
}
