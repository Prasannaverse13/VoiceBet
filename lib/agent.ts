import { parseIntent } from "./parser";
import { findContract, priceFor, geminiMode, placeOrder, listMarkets } from "./gemini";
import { nudgeDemo } from "./sample-markets";
import { checkPolicy, spentToday } from "./policy";
import { stakeOnchain, explorer } from "./solana";
import { sendAlert } from "./social";
import { analyze, type Turn } from "./analyst";
import { state, save, log, uid } from "./store";
import type { CommandResult, Contract, Intent, Outcome, Trade, WatchRule } from "./types";

const cents = (p: number) => `${Math.round(p * 100)} cents`;

export async function executeTrade(contract: Contract, outcome: Outcome, amountUsdc: number, maxPrice?: number): Promise<{ trade?: Trade; reply: string; policy: ReturnType<typeof checkPolicy> }> {
  const price = priceFor(contract, outcome);
  const policy = checkPolicy(amountUsdc, price, contract);
  if (maxPrice && price > maxPrice) {
    policy.ok = false;
    policy.reasons.push(`Price ${cents(price)} is above the limit you said of ${cents(maxPrice)}.`);
  }
  if (!policy.ok) {
    log("policy", `Blocked: ${policy.reasons.join(" ")}`);
    return { policy, reply: `I did not place it. ${policy.reasons[0]}` };
  }

  const contracts = Math.max(1, Math.floor(amountUsdc / Math.max(price, 0.01)));
  const cost = +(contracts * price).toFixed(2);
  const mode = geminiMode();
  const trade: Trade = {
    id: uid("t"),
    at: new Date().toISOString(),
    symbol: contract.symbol,
    eventTitle: contract.eventTitle,
    label: contract.label,
    outcome,
    price,
    contracts,
    costUsdc: cost,
    mode,
    solanaMode: "simulated",
    status: "filled",
  };

  if (mode === "live") {
    try {
      const r = await placeOrder(contract.symbol, outcome, contracts, price);
      trade.geminiOrderId = r.orderId;
    } catch (e) {
      trade.status = "failed";
      trade.note = (e as Error).message;
      state().trades.unshift(trade);
      save();
      log("error", `Gemini order failed: ${trade.note}`);
      return { trade, policy, reply: `Gemini rejected the order. ${trade.note}` };
    }
  } else {
    trade.geminiOrderId = `paper_${trade.id}`;
  }

  const memo = `VoiceBet|${contract.symbol}|${outcome}|${contracts}@${price.toFixed(2)}|${cost}USDC|${trade.geminiOrderId}`;
  const onchain = await stakeOnchain(cost, memo);
  trade.solanaSig = onchain.sig;
  trade.solanaMode = onchain.mode;
  if (onchain.note) trade.note = onchain.note;

  state().trades.unshift(trade);
  save();
  log(
    "trade",
    `Bought ${contracts} ${outcome.toUpperCase()} on ${contract.eventTitle} (${contract.label}) at ${cents(price)}. Cost ${cost} USDC. ${mode === "paper" ? "Paper fill." : "Live on Gemini."}`,
    onchain.mode === "devnet" ? explorer(onchain.sig) : undefined
  );
  sendAlert(trade).catch(() => undefined);

  const left = Math.max(0, state().policy.dailyCapUsdc - spentToday());
  return {
    trade,
    policy,
    reply: `Done. I bought ${contracts} ${outcome} contracts on ${contract.eventTitle} at ${cents(price)}. That cost ${cost} USDC. You have ${left.toFixed(0)} USDC left today.`,
  };
}

function statusReply() {
  const s = state();
  const spent = spentToday();
  const open = s.rules.filter((r) => r.active).length;
  return `You spent ${spent.toFixed(2)} of ${s.policy.dailyCapUsdc} USDC today across ${s.trades.filter((t) => t.status === "filled").length} trades. ${open} watch rules are live. Trading is ${s.policy.killSwitch ? "paused" : "on"}.`;
}

export async function recapReply() {
  const s = state();
  const today = s.trades.filter((t) => t.status === "filled" && new Date(t.at).toDateString() === new Date().toDateString());
  if (!today.length) return "No trades yet today. Your budget is untouched.";
  const { markets } = await listMarkets();
  let pnl = 0;
  for (const t of today) {
    const m = markets.find((x) => x.symbol === t.symbol);
    if (m) pnl += (priceFor(m, t.outcome) - t.price) * t.contracts;
  }
  const best = [...today].sort((a, b) => b.costUsdc - a.costUsdc)[0];
  return `Here is your recap. You made ${today.length} trades for ${today.reduce((a, t) => a + t.costUsdc, 0).toFixed(2)} USDC. Marked to market you are ${pnl >= 0 ? "up" : "down"} ${Math.abs(pnl).toFixed(2)} USDC. Your biggest position is ${best.outcome} on ${best.eventTitle}.`;
}

export async function handleCommand(text: string, history: Turn[] = []): Promise<CommandResult> {
  log("voice", text);
  const intent: Intent = await parseIntent(text);
  const s = state();

  if (intent.action === "stop") {
    s.policy.killSwitch = true;
    save();
    log("policy", "Kill switch on by voice.");
    return { intent, reply: "Kill switch is on. I will not place any trades until you say resume." };
  }
  if (intent.action === "resume") {
    s.policy.killSwitch = false;
    save();
    log("policy", "Trading resumed by voice.");
    return { intent, reply: "Trading is back on. Your limits still apply." };
  }
  if (intent.action === "status") return { intent, reply: statusReply() };
  if (intent.action === "recap") return { intent, reply: await recapReply() };
  if (intent.action === "ask" || intent.action === "unknown" || !intent.query) {
    const a = await analyze(text, history);
    log("agent", a.reply);
    return { intent: { ...intent, action: "ask" }, reply: a.reply, answeredBy: a.source };
  }

  const contract = await findContract(intent.query);
  if (!contract) return { intent, reply: `I could not find a live market for ${intent.query}. Try other words.` };
  log("agent", `Matched "${intent.query}" to ${contract.eventTitle} / ${contract.label} (${contract.symbol}).`);
  const outcome = intent.outcome ?? "yes";
  const amount = intent.amountUsdc ?? 10;

  if (intent.action === "watch") {
    const rule: WatchRule = {
      id: uid("r"),
      createdAt: new Date().toISOString(),
      intent,
      symbol: contract.symbol,
      eventTitle: contract.eventTitle,
      label: contract.label,
      outcome,
      amountUsdc: amount,
      triggerBelow: intent.triggerBelow,
      triggerAbove: intent.triggerAbove,
      active: true,
    };
    s.rules.unshift(rule);
    save();
    const now = priceFor(contract, outcome);
    const cond = rule.triggerBelow ? `drops below ${cents(rule.triggerBelow)}` : `rises above ${cents(rule.triggerAbove ?? 0.5)}`;
    log("agent", `Watching ${contract.eventTitle}. Will buy ${amount} USDC of ${outcome} when it ${cond}. Now ${cents(now)}.`);
    const result: CommandResult = {
      intent,
      contract,
      policy: checkPolicy(amount, now, contract),
      rule,
      reply: `Got it. I am watching ${contract.eventTitle}. It is at ${cents(now)} now. I will put ${amount} USDC on ${outcome} when it ${cond}.`,
    };
    await evaluateRules(true);
    if (rule.firedTradeId) result.reply = `It is already at ${cents(now)} so I bought it now. ${result.reply.split(". ").slice(-1)[0]}`;
    return result;
  }

  const r = await executeTrade(contract, outcome, amount, intent.maxPrice);
  return { intent, contract, policy: r.policy, trade: r.trade, reply: r.reply };
}

/** Checks watch rules against live prices. Called by stream webhooks and UI polling. */
export async function evaluateRules(force = false) {
  const s = state();
  if (!force && Date.now() - s.lastRuleCheck < 5000) return [];
  s.lastRuleCheck = Date.now();
  const active = s.rules.filter((r) => r.active);
  if (!active.length) return [];
  const { markets: first, live } = await listMarkets();
  let markets = first;
  if (!live && !force) {
    for (const r of active) nudgeDemo(r.symbol, r.outcome, r.triggerBelow, r.triggerAbove);
    markets = (await listMarkets()).markets;
  }
  const fired: Trade[] = [];
  for (const rule of active) {
    const m = markets.find((x) => x.symbol === rule.symbol);
    if (!m) continue;
    const p = priceFor(m, rule.outcome);
    const hit = (rule.triggerBelow !== undefined && p < rule.triggerBelow) || (rule.triggerAbove !== undefined && p > rule.triggerAbove);
    if (!hit) continue;
    rule.active = false;
    log("agent", `Trigger hit on ${rule.eventTitle}: ${rule.outcome} at ${cents(p)}.`);
    const r = await executeTrade(m, rule.outcome, rule.amountUsdc);
    if (r.trade) {
      rule.firedTradeId = r.trade.id;
      fired.push(r.trade);
    }
  }
  save();
  return fired;
}
