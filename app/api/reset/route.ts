import { NextResponse } from "next/server";
import { resetState } from "@/lib/store";
import { withUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  return withUser(async () => {
    resetState();
    return NextResponse.json({ ok: true });
  });
}
