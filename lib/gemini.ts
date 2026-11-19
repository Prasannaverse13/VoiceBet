import crypto from "crypto";
import type { Contract, Outcome } from "./types";
import { demoMarkets } from "./sample-markets";

const BASE = process.env.GEMINI_BASE_URL || "https://api.gemini.com";

type Cache = { at: number; data: Contract[]; live: boolean; error?: string };
const g = globalThis as unknown as { __geminiCache?: Cache };

function num(v: unknown, d = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flatten(events: any[]): Contract[] {
  const out: Contract[] = [];
  for (const e of events) {
    const all = [e, ...(Array.isArray(e.events) ? e.events : [])];
    for (const ev of all) {
      for (const c of ev.contracts ?? []) {
        if (c.marketState && c.marketState !== "open") continue;
        const p = c.prices ?? {};
        const last = num(p.lastTradePrice, num(p.buy?.yes, 0.5));
        const yesAsk = num(p.buy?.yes, num(p.bestAsk, last));
        const noAsk = num(p.buy?.no, +(1 - num(p.bestBid, last)).toFixed(2));
        out.push({
          eventId: String(ev.id),
          eventTitle: String(ev.title ?? e.title),
          category: String(ev.category ?? e.category ?? "other").toLowerCase(),
          label: String(c.label ?? c.abbreviatedName ?? "Yes"),
          symbol: String(c.instrumentSymbol ?? c.ticker ?? c.id),
          yesAsk,
          noAsk,
          lastPrice: last,
          expiry: c.expiryDate ?? ev.expiryDate,
          volume: ev.volume,
        });
      }
    }
  }
  return out;
}

export async function listMarkets(force = false): Promise<{ markets: Contract[]; live: boolean; error?: string }> {
  const c = g.__geminiCache;
  if (!force && c && Date.now() - c.at < (c.live ? 15000 : 60000)) return { markets: c.live ? c.data : demoMarkets(), live: c.live, error: c.error };
  try {
    const res = await fetch(`${BASE}/v1/prediction-markets/events?status=active&limit=60`, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "VoiceBet/1.0" },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`Gemini answered ${res.status} ${res.statusText}`.trim());
    const json = await res.json();
    const markets = flatten(json.data ?? []);
    if (!markets.length) throw new Error("no markets");
    g.__geminiCache = { at: Date.now(), data: markets, live: true };
    return { markets, live: true };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const error =
      err.name === "TimeoutError" || err.name === "AbortError"
        ? "Gemini took too long to answer"
        : err.cause?.code
        ? `Network error: ${err.cause.code}`
        : err.message || "Could not reach Gemini";
    console.warn("[gemini] using demo markets:", error);
    g.__geminiCache = { at: Date.now(), data: [], live: false, error };
    return { markets: demoMarkets(), live: false, error };
  }
}

const STOP = new Set("will the a an be by in on of to market odds rate price".split(" "));

export async function findContract(query: string): Promise<Contract | undefined> {
  const { markets } = await listMarkets();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
  if (!words.length) return undefined;
  let best: { c: Contract; score: number } | undefined;
  for (const c of markets) {
    const hay = `${c.eventTitle} ${c.label} ${c.symbol} ${c.category}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += w.length > 3 ? 2 : 1;
      else if (w.length > 4 && hay.includes(w.slice(0, 4))) score += 1;
    }
    if (/\bcut\b/.test(query) && /cut|dn/i.test(c.label + c.symbol)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { c, score };
  }
  return best?.c;
}

export function priceFor(c: Contract, outcome: Outcome) {
  return outcome === "yes" ? c.yesAsk : c.noAsk;
}

export async function getContract(symbol: string) {
  const { markets } = await listMarkets();
  return markets.find((m) => m.symbol === symbol);
}

export function geminiMode(): "paper" | "live" {
  return process.env.GEMINI_MODE === "live" && process.env.GEMINI_API_KEY && process.env.GEMINI_API_SECRET ? "live" : "paper";
}

/** Places a signed limit order on Gemini Prediction Markets (live mode only). */
export async function placeOrder(symbol: string, outcome: Outcome, contracts: number, price: number) {
  const key = process.env.GEMINI_API_KEY!;
  const secret = process.env.GEMINI_API_SECRET!;
  const requestPath = "/v1/prediction-markets/order";
  const body = {
    request: requestPath,
    nonce: Date.now().toString(),
    symbol,
    orderType: "limit",
    side: "buy",
    quantity: String(contracts),
    price: price.toFixed(2),
    outcome,
    timeInForce: "immediate-or-cancel",
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64");
  const signature = crypto.createHmac("sha384", secret).update(payload).digest("hex");
  const res = await fetch(`${BASE}${requestPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": "0",
      "Cache-Control": "no-cache",
      "X-GEMINI-APIKEY": key,
      "X-GEMINI-PAYLOAD": payload,
      "X-GEMINI-SIGNATURE": signature,
    },
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.reason || `Gemini order failed (${res.status})`);
  return { orderId: String(json.orderId ?? json.order_id ?? json.id ?? "unknown"), raw: json };
}
