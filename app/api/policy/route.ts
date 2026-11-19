import { NextResponse } from "next/server";
import { state, save, log } from "@/lib/store";
import { withUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withUser(async () => {
  const body = await req.json().catch(() => ({}));
  const p = state().policy;
  const numKey = (k: "dailyCapUsdc" | "perBetMaxUsdc" | "maxPrice" | "requireVoiceConfirmAbove", min: number, max: number) => {
    if (typeof body[k] === "number" && Number.isFinite(body[k])) p[k] = Math.min(max, Math.max(min, body[k]));
  };
  numKey("dailyCapUsdc", 0, 100000);
  numKey("perBetMaxUsdc", 0, 100000);
  numKey("maxPrice", 0.01, 0.99);
  numKey("requireVoiceConfirmAbove", 0, 100000);
  if (typeof body.killSwitch === "boolean") {
    p.killSwitch = body.killSwitch;
    log("policy", body.killSwitch ? "Kill switch on." : "Trading resumed.");
  }
  if (Array.isArray(body.allowedCategories)) p.allowedCategories = body.allowedCategories.map(String).map((c: string) => c.toLowerCase());
  save();
  return NextResponse.json({ policy: p });
  });
}
