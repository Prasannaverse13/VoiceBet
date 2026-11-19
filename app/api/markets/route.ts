import { NextResponse } from "next/server";
import { listMarkets } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() ?? "";
  const { markets, live, error } = await listMarkets(new URL(req.url).searchParams.get("refresh") === "1");
  const list = q ? markets.filter((m) => `${m.eventTitle} ${m.label} ${m.category}`.toLowerCase().includes(q)) : markets;
  return NextResponse.json({ live, error, markets: list.slice(0, 60) });
}
