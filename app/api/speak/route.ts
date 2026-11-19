import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** ElevenLabs text to speech. ElevenLabs only. Errors come back as JSON so the screen can show them. */

let okVoice: string | null = null; // a voice that worked for this key

async function pickVoice(key: string, skip: string[]): Promise<string[]> {
  // voices in this account that free plans may use (premade and own voices)
  const out: string[] = [];
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      const list: { voice_id: string; category?: string }[] = j.voices ?? [];
      const rank = (c?: string) => (c === "premade" ? 0 : c === "cloned" || c === "generated" ? 1 : 2);
      list
        .filter((v) => !skip.includes(v.voice_id))
        .sort((a, b) => rank(a.category) - rank(b.category))
        .forEach((v) => out.push(v.voice_id));
    }
  } catch {
    /* use the fixed list below */
  }
  // premade voices that ship with every account
  for (const id of ["JBFqnCBsd6RMkjVDRZzb", "EXAVITQu4vr4xnSDxMaL", "CwhRBWXzGAHq8TQ4Fs17", "IKne3meq5aSn9XLyUdCD"]) if (!skip.includes(id) && !out.includes(id)) out.push(id);
  return out.slice(0, 6);
}

async function tts(key: string, voice: string, text: string) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: String(text).slice(0, 800), model_id: "eleven_flash_v2_5", voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
    signal: AbortSignal.timeout(15000),
  });
}

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: "" }));
  const key = process.env.ELEVENLABS_API_KEY;
  if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });
  if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is missing in .env" }, { status: 501 });
  try {
    const tried: string[] = [];
    const first = okVoice || process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
    let queue: string[] = [first];
    let lastErr = "";
    for (let i = 0; i < 8 && queue.length; i++) {
      const voice = queue.shift()!;
      tried.push(voice);
      const res = await tts(key, voice, text);
      if (res.ok) {
        okVoice = voice;
        return new NextResponse(await res.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
      }
      const j = await res.json().catch(() => ({}));
      lastErr = String(j?.detail?.message || j?.detail?.status || j?.message || `ElevenLabs error ${res.status}`);
      if (okVoice === voice) okVoice = null;
      const voiceProblem = /library voice|voice.*(not found|unavailable)|upgrade|paid_plan|voice_not_found/i.test(lastErr) || res.status === 404 || res.status === 402;
      if (!voiceProblem) break; // a key or quota problem. Another voice will not help
      if (!queue.length && tried.length === 1) queue = await pickVoice(key, tried);
    }
    return NextResponse.json({ error: lastErr || "ElevenLabs failed" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "could not reach ElevenLabs" }, { status: 502 });
  }
}
