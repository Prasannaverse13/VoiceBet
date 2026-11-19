// Live coin prices from CoinGecko (free, no key). Used so the AI can answer coin questions.
const COINS: Record<string, string> = {
  solana: "solana", sol: "solana", bitcoin: "bitcoin", btc: "bitcoin", ethereum: "ethereum", ether: "ethereum", eth: "ethereum",
  xrp: "ripple", ripple: "ripple", dogecoin: "dogecoin", doge: "dogecoin", cardano: "cardano", ada: "cardano",
  bnb: "binancecoin", avalanche: "avalanche-2", avax: "avalanche-2", chainlink: "chainlink", link: "chainlink",
  polkadot: "polkadot", litecoin: "litecoin", ltc: "litecoin", sui: "sui", toncoin: "the-open-network", ton: "the-open-network",
};
const NAMES: Record<string, string> = { "avalanche-2": "Avalanche", ripple: "XRP", binancecoin: "BNB", "the-open-network": "Toncoin" };

export type CoinPrice = { coin: string; usd: number; change24hPct: number | null };
let cache: { at: number; key: string; data: CoinPrice[] } | null = null;

export function coinsIn(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  const ids = new Set<string>();
  for (const w of words) if (COINS[w]) ids.add(COINS[w]);
  if (/\bcrypto|coin|coins|token\b/i.test(text) && !ids.size) ["bitcoin", "ethereum", "solana"].forEach((i) => ids.add(i));
  return [...ids].slice(0, 5);
}

export async function coinPrices(text: string): Promise<CoinPrice[]> {
  const ids = coinsIn(text);
  if (!ids.length) return [];
  const key = ids.join(",");
  if (cache && cache.key === key && Date.now() - cache.at < 30_000) return cache.data;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${key}&vs_currencies=usd&include_24hr_change=true`, {
      signal: AbortSignal.timeout(6000),
      headers: { accept: "application/json" },
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const data: CoinPrice[] = ids
      .filter((id) => j[id]?.usd != null)
      .map((id) => ({
        coin: NAMES[id] ?? id[0].toUpperCase() + id.slice(1),
        usd: j[id].usd,
        change24hPct: typeof j[id].usd_24h_change === "number" ? Math.round(j[id].usd_24h_change * 10) / 10 : null,
      }));
    cache = { at: Date.now(), key, data };
    return data;
  } catch {
    return [];
  }
}
