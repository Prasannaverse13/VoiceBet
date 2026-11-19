import { state } from "./store";
import type { Contract, PolicyResult } from "./types";

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function spentToday() {
  const since = startOfDay();
  return state()
    .trades.filter((t) => t.status !== "failed" && new Date(t.at).getTime() >= since)
    .reduce((sum, t) => +(sum + t.costUsdc).toFixed(2), 0);
}

export function checkPolicy(amount: number, price: number, contract?: Contract): PolicyResult {
  const p = state().policy;
  const reasons: string[] = [];
  const spent = spentToday();
  if (p.killSwitch) reasons.push("Kill switch is on. All trading is paused.");
  if (!(amount > 0)) reasons.push("Amount must be more than 0 USDC.");
  if (amount > p.perBetMaxUsdc) reasons.push(`Bet of ${amount} USDC is over the per bet max of ${p.perBetMaxUsdc} USDC.`);
  if (spent + amount > p.dailyCapUsdc)
    reasons.push(`That would pass your daily cap. Spent ${spent.toFixed(2)} of ${p.dailyCapUsdc} USDC today.`);
  if (price > p.maxPrice) reasons.push(`Price ${Math.round(price * 100)}c is above your max of ${Math.round(p.maxPrice * 100)}c.`);
  if (contract && contract.category && !p.allowedCategories.includes(contract.category.toLowerCase()))
    reasons.push(`Category ${contract.category} is not on your allowlist.`);
  return { ok: reasons.length === 0, reasons, spentToday: spent, remainingToday: Math.max(0, p.dailyCapUsdc - spent) };
}
