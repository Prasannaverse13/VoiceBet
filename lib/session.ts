// Works in both the Edge middleware and Node routes (Web Crypto only).
export const COOKIE = "vb_session";
export const NONCE_COOKIE = "vb_nonce";
export const SESSION_TTL = 7 * 24 * 3600;
export const NONCE_TTL = 300;

const enc = new TextEncoder();
const dec = new TextDecoder();

function secret() {
  return process.env.SESSION_SECRET || "voicebet-dev-secret-change-me";
}

function b64u(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signToken(payload: Record<string, unknown>) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body)));
  return `${body}.${b64u(sig)}`;
}

async function readToken(token?: string): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(fromB64u(body)));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

const now = () => Math.floor(Date.now() / 1000);

export const createSessionToken = (address: string) => signToken({ a: address.toLowerCase(), exp: now() + SESSION_TTL });
export const createNonceToken = (nonce: string) => signToken({ n: nonce, exp: now() + NONCE_TTL });

export async function verifySession(token?: string): Promise<{ address: string } | null> {
  const p = await readToken(token);
  return p && typeof p.a === "string" ? { address: p.a } : null;
}

export async function verifyNonce(token?: string): Promise<string | null> {
  const p = await readToken(token);
  return p && typeof p.n === "string" ? p.n : null;
}
