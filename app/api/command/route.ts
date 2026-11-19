import { NextResponse } from "next/server";
import { handleCommand } from "@/lib/agent";
import { withUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withUser(async () => {
    const body = await req.json().catch(() => ({}));
    const text = body?.text;
    const history = Array.isArray(body?.history)
      ? body.history
          .filter((t: { role?: string; text?: unknown }) => (t.role === "user" || t.role === "agent") && typeof t.text === "string")
          .slice(-6)
      : [];
    if (!text || typeof text !== "string") return NextResponse.json({ error: "text is required" }, { status: 400 });
    return NextResponse.json(await handleCommand(text.slice(0, 500), history));
  });
}
