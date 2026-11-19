import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Auth routes are open. The stream webhook has its own token.
  if (pathname.startsWith("/api/auth/") || pathname === "/api/streams") return NextResponse.next();

  const session = await verifySession(req.cookies.get(COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "?signin=1";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/agent/:path*", "/api/:path*"] };
