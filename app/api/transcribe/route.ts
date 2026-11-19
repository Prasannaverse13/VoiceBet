import { NextResponse } from "next/server";
import { withUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Backup voice typing. Sends a recording to ElevenLabs speech to text. */
export async function POST(req: Request) {
  return withUser(async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is not set." }, { status: 501 });

    const form = await req.formData().catch(() => null);
    const file = form?.get("audio");
    if (!(file instanceof Blob) || file.size < 1000) return NextResponse.json({ error: "No audio received." }, { status: 400 });
    if (file.size > 8_000_000) return NextResponse.json({ error: "Recording is too long." }, { status: 413 });

    const out = new FormData();
    out.append("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v2");
    out.append("file", file, (file as File).name || "voice.webm");

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": key },
        body: out,
        signal: AbortSignal.timeout(30000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const d = json?.detail;
        const msg = typeof d === "string" ? d : d?.message || `ElevenLabs returned ${res.status}`;
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      return NextResponse.json({ text: String(json.text ?? "").trim() });
    } catch {
      return NextResponse.json({ error: "Could not reach ElevenLabs." }, { status: 502 });
    }
  });
}
