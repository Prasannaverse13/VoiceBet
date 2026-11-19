import type { Contract } from "./types";

/** Offline demo markets. Used only when the Gemini API cannot be reached. */
const seed: Contract[] = [
  { eventId: "demo-fed", eventTitle: "Fed rate decision in December", category: "economics", label: "Cut 25 bps", symbol: "GEMI-FEDDEC26-DN25", yesAsk: 0.43, noAsk: 0.58, lastPrice: 0.43, volume: "1840000" },
  { eventId: "demo-fed", eventTitle: "Fed rate decision in December", category: "economics", label: "No change", symbol: "GEMI-FEDDEC26-NC", yesAsk: 0.55, noAsk: 0.46, lastPrice: 0.55, volume: "1210000" },
  { eventId: "demo-btc", eventTitle: "Bitcoin above 150k by year end", category: "crypto", label: "Yes", symbol: "GEMI-BTC150K26", yesAsk: 0.22, noAsk: 0.79, lastPrice: 0.22, volume: "3020000" },
  { eventId: "demo-eth", eventTitle: "ETH above 5k on Dec 31", category: "crypto", label: "Yes", symbol: "GEMI-ETH5K26", yesAsk: 0.18, noAsk: 0.83, lastPrice: 0.18, volume: "990000" },
  { eventId: "demo-sol", eventTitle: "SOL above 300 by year end", category: "crypto", label: "Yes", symbol: "GEMI-SOL300-26", yesAsk: 0.31, noAsk: 0.7, lastPrice: 0.31, volume: "760000" },
  { eventId: "demo-cpi", eventTitle: "November CPI above 3 percent", category: "economics", label: "Yes", symbol: "GEMI-CPINOV26-3", yesAsk: 0.37, noAsk: 0.64, lastPrice: 0.37, volume: "540000" },
  { eventId: "demo-snow", eventTitle: "Snow in Austin before New Year", category: "weather", label: "Yes", symbol: "GEMI-AUSSNOW26", yesAsk: 0.09, noAsk: 0.92, lastPrice: 0.09, volume: "88000" },
  { eventId: "demo-nba", eventTitle: "Lakers win on Friday", category: "sports", label: "Lakers", symbol: "GEMI-NBA-LAL-1121", yesAsk: 0.47, noAsk: 0.54, lastPrice: 0.47, volume: "410000" },
];

const g = globalThis as unknown as { __demoMarkets?: Contract[]; __demoTick?: number };

/** Gentle random walk so watch rules can trigger during a demo. */
export function demoMarkets(): Contract[] {
  if (!g.__demoMarkets) g.__demoMarkets = seed.map((c) => ({ ...c }));
  const now = Date.now();
  if (!g.__demoTick || now - g.__demoTick > 4000) {
    g.__demoTick = now;
    g.__demoMarkets = g.__demoMarkets.map((c) => {
      const drift = (Math.random() - 0.52) * 0.03;
      const yes = Math.min(0.97, Math.max(0.03, +(c.yesAsk + drift).toFixed(2)));
      return { ...c, yesAsk: yes, noAsk: +Math.min(0.97, 1.01 - yes).toFixed(2), lastPrice: yes };
    });
  }
  return g.__demoMarkets;
}

/** Demo only: drift a watched contract toward its trigger so the judge sees a rule fire. */
export function nudgeDemo(symbol: string, outcome: "yes" | "no", below?: number, above?: number) {
  const list = demoMarkets();
  const m = list.find((x) => x.symbol === symbol);
  if (!m) return;
  const cur = outcome === "yes" ? m.yesAsk : m.noAsk;
  const dir = below !== undefined ? -1 : above !== undefined ? 1 : 0;
  if (!dir) return;
  const next = Math.min(0.97, Math.max(0.03, +(cur + dir * (0.02 + Math.random() * 0.02)).toFixed(2)));
  if (outcome === "yes") { m.yesAsk = next; m.noAsk = +Math.min(0.97, 1.01 - next).toFixed(2); m.lastPrice = next; }
  else { m.noAsk = next; m.yesAsk = +Math.min(0.97, 1.01 - next).toFixed(2); m.lastPrice = m.yesAsk; }
}
