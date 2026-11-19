import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const address = await currentUser();
  if (!address) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ address });
}
