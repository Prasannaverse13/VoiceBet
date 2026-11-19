import { NextResponse } from "next/server";
import { NONCE_COOKIE, NONCE_TTL, createNonceToken } from "@/lib/session";
import { isHttps } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE, await createNonceToken(nonce), { httpOnly: true, sameSite: "lax", path: "/", maxAge: NONCE_TTL, secure: isHttps(req) });
  return res;
}
