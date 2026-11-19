export type Outcome = "yes" | "no";

export type IntentAction = "bet" | "watch" | "status" | "stop" | "resume" | "recap" | "ask" | "unknown";

export interface Intent {
  action: IntentAction;
  query?: string;
  outcome?: Outcome;
  amountUsdc?: number;
  maxPrice?: number;     // 0 to 1, e.g. 0.4 means 40 cents
  triggerBelow?: number; // 0 to 1, fire when price drops below
  triggerAbove?: number; // 0 to 1, fire when price rises above
  raw: string;
  source: "grok" | "rules";
}

export interface Contract {
  eventId: string;
  eventTitle: string;
  category: string;
  label: string;
  symbol: string;
  yesAsk: number;
  noAsk: number;
  lastPrice: number;
  expiry?: string;
  volume?: string;
}

export interface Policy {
  dailyCapUsdc: number;
  perBetMaxUsdc: number;
  maxPrice: number;
  allowedCategories: string[];
  killSwitch: boolean;
  requireVoiceConfirmAbove: number;
}

export interface PolicyResult {
  ok: boolean;
  reasons: string[];
  spentToday: number;
  remainingToday: number;
}

export interface Trade {
  id: string;
  at: string;
  symbol: string;
  eventTitle: string;
  label: string;
  outcome: Outcome;
  price: number;
  contracts: number;
  costUsdc: number;
  mode: "paper" | "live";
  geminiOrderId?: string;
  solanaSig?: string;
  solanaMode: "devnet" | "simulated";
  status: "filled" | "open" | "failed";
  note?: string;
}

export interface WatchRule {
  id: string;
  createdAt: string;
  intent: Intent;
  symbol: string;
  eventTitle: string;
  label: string;
  outcome: Outcome;
  amountUsdc: number;
  triggerBelow?: number;
  triggerAbove?: number;
  active: boolean;
  firedTradeId?: string;
}

export interface FeedItem {
  id: string;
  at: string;
  kind: "voice" | "agent" | "trade" | "policy" | "stream" | "alert" | "error";
  text: string;
  link?: string;
}

export interface AgentState {
  policy: Policy;
  trades: Trade[];
  rules: WatchRule[];
  feed: FeedItem[];
  lastRuleCheck: number;
  createdAt?: string;
}

export interface CommandResult {
  intent: Intent;
  contract?: Contract;
  policy?: PolicyResult;
  trade?: Trade;
  rule?: WatchRule;
  reply: string;
  answeredBy?: "grok" | "rules";
}
