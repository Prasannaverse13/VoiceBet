import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import type { AgentState, FeedItem } from "./types";

const FILE = path.join(process.cwd(), "data", "state.json");

const defaults: AgentState = {
  policy: {
    dailyCapUsdc: 100,
    perBetMaxUsdc: 25,
    maxPrice: 0.9,
    allowedCategories: ["politics", "crypto", "economics", "sports", "weather", "commodities", "tech", "culture", "other"],
    killSwitch: false,
    requireVoiceConfirmAbove: 50,
  },
  trades: [],
  rules: [],
  feed: [],
  lastRuleCheck: 0,
};

type G = { __vbUsers?: Record<string, AgentState>; __vbAls?: AsyncLocalStorage<string> };
const g = globalThis as unknown as G;

const als = () => (g.__vbAls ??= new AsyncLocalStorage<string>());

function fresh(): AgentState {
  const s: AgentState = JSON.parse(JSON.stringify(defaults));
  s.createdAt = new Date().toISOString();
  return s;
}

function loadAll(): Record<string, AgentState> {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
      if (parsed?.version === 2 && parsed.users) {
        const out: Record<string, AgentState> = {};
        for (const [addr, u] of Object.entries<AgentState>(parsed.users)) out[addr] = { ...defaults, ...u, policy: { ...defaults.policy, ...u.policy } };
        return out;
      }
    }
  } catch {
    /* start clean */
  }
  return {};
}

const users = () => (g.__vbUsers ??= loadAll());

/** Run code as one signed in user. state() then returns that user's own agent. */
export function runAs<T>(address: string, fn: () => T): T {
  return als().run(address.toLowerCase(), fn);
}

export function state(): AgentState {
  const a = als().getStore();
  if (!a) throw new Error("No user context");
  const all = users();
  return (all[a] ??= fresh());
}

export const hasUser = (address: string) => !!users()[address.toLowerCase()];
export const allUsers = () => Object.keys(users());

export function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ version: 2, users: users() }, null, 2));
  } catch {
    /* read only hosts like Vercel: keep memory only */
  }
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function log(kind: FeedItem["kind"], text: string, link?: string) {
  const s = state();
  s.feed.unshift({ id: uid("f"), at: new Date().toISOString(), kind, text, link });
  s.feed = s.feed.slice(0, 200);
  save();
}

export function resetState() {
  const a = als().getStore();
  if (!a) return;
  users()[a] = fresh();
  save();
}
