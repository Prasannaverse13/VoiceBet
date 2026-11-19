import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, verifySession } from "./session";
import { runAs } from "./store";

export async function currentUser(): Promise<string | null> {
  const s = await verifySession(cookies().get(COOKIE)?.value);
  return s?.address ?? null;
}

/** Runs the handler inside the signed in user's own agent state. */
export async function withUser(fn: (address: string) => Promise<Response>): Promise<Response> {
  const address = await currentUser();
  if (!address) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return runAs(address, () => fn(address));
}

export function isHttps(req: Request) {
  return req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
}
