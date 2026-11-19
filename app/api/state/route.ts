import { NextResponse } from "next/server";
import { state } from "@/lib/store";
import { spentToday } from "@/lib/policy";
import { evaluateRules } from "@/lib/agent";
import { walletInfo, explorer } from "@/lib/solana";
import { geminiMode } from "@/lib/gemini";
import { withUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withUser(async () => {
  const withWallet = new URL(req.url).searchParams.get("wallet") === "1";
  await evaluateRules().catch(() => undefined);
  const s = state();
  return NextResponse.json({
    policy: s.policy,
    spentToday: spentToday(),
    trades: s.trades.slice(0, 50).map((t) => ({ ...t, explorer: t.solanaMode === "devnet" && t.solanaSig ? explorer(t.solanaSig) : null })),
    rules: s.rules.slice(0, 30),
    feed: s.feed.slice(0, 60),
    wallet: withWallet ? await walletInfo() : undefined,
    integrations: {
      grok: !!process.env.XAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      gemini: geminiMode(),
      x: !!process.env.X_USER_ACCESS_TOKEN,
      quicknode: !!process.env.QUICKNODE_STREAM_TOKEN,
    },
  });
  });
}
