import { NextResponse } from "next/server";
import { state, save, log } from "@/lib/store";
import { withUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  return withUser(async () => {
  const id = new URL(req.url).searchParams.get("id");
  const s = state();
  const r = s.rules.find((x) => x.id === id);
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  r.active = false;
  save();
  log("agent", `Cancelled watch on ${r.eventTitle}.`);
  return NextResponse.json({ ok: true });
  });
}
