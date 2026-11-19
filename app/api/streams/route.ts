import { NextResponse } from "next/server";
import { allUsers, log, runAs } from "@/lib/store";
import { evaluateRules } from "@/lib/agent";
import { agentKeypair } from "@/lib/solana";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scan(node: any, needles: string[], hits: Set<string>, depth = 0) {
  if (depth > 12 || node == null) return;
  if (typeof node === "string") {
    for (const n of needles) if (n && node.includes(n)) hits.add(n);
    return;
  }
  if (Array.isArray(node)) {
    for (const x of node.slice(0, 5000)) scan(x, needles, hits, depth + 1);
    return;
  }
  if (typeof node === "object") for (const k of Object.keys(node)) scan(node[k], needles, hits, depth + 1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function slotOf(body: any): string | undefined {
  const first = Array.isArray(body) ? body[0] : body?.data?.[0] ?? body;
  return first?.slot?.toString() ?? first?.blockHeight?.toString() ?? first?.parentSlot?.toString();
}

/** QuickNode Streams destination. Set the URL to /api/streams?token=YOUR_TOKEN */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-voicebet-token");
  const expected = process.env.QUICKNODE_STREAM_TOKEN;
  if (!expected || token !== expected) return NextResponse.json({ error: "bad or missing token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const agent = agentKeypair()?.publicKey.toBase58();
  const needles = [agent, process.env.ESCROW_WALLET, "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"].filter(Boolean) as string[];
  const hits = new Set<string>();
  scan(body, needles, hits);

  const count = Array.isArray(body) ? body.length : Array.isArray(body?.data) ? body.data.length : 1;
  const slot = slotOf(body);
  const users = allUsers();
  let fired = 0;
  for (const u of users) {
    await runAs(u, async () => {
      if (agent && hits.has(agent)) log("stream", `QuickNode Stream saw agent wallet activity${slot ? ` at slot ${slot}` : ""}.`);
      else log("stream", `QuickNode Stream batch: ${count} item${count === 1 ? "" : "s"}${slot ? `, slot ${slot}` : ""}. Rechecked watch rules.`);
      fired += (await evaluateRules(true)).length;
    });
  }
  return NextResponse.json({ ok: true, users: users.length, fired });
}
