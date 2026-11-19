import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAddress, verifyMessage } from "ethers";
import { COOKIE, NONCE_COOKIE, SESSION_TTL, createSessionToken, verifyNonce } from "@/lib/session";
import { isHttps } from "@/lib/auth";
import { hasUser, log, runAs } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { address, message, signature } = body ?? {};
  if (typeof address !== "string" || typeof message !== "string" || typeof signature !== "string" || !isAddress(address) || message.length > 1000)
    return fail("Bad request.");

  const nonce = await verifyNonce(cookies().get(NONCE_COOKIE)?.value);
  if (!nonce) return fail("Sign in expired. Please try again.");

  // The signed text must be for this site, this wallet and this nonce.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const lines = message.split("\n");
  if (lines[0] !== `${host} wants you to sign in with your Ethereum account:` || (lines[1] ?? "").toLowerCase() !== address.toLowerCase() || !lines.includes(`Nonce: ${nonce}`))
    return fail("Message did not match this site.");

  let recovered: string;
  try {
    recovered = verifyMessage(message, signature);
  } catch {
    return fail("Bad signature.");
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) return fail("Signature does not match this wallet.", 401);

  const addr = address.toLowerCase();
  const isNew = !hasUser(addr);
  runAs(addr, () => log("agent", isNew ? "Account created. Welcome." : "Signed in."));

  const res = NextResponse.json({ address: addr, isNew });
  res.cookies.set(COOKIE, await createSessionToken(addr), { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL, secure: isHttps(req) });
  res.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
