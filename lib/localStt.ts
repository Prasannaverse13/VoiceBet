// Free speech to text that runs inside the browser (Whisper tiny via transformers.js).
// No API key. The first use downloads about 80 MB, then the browser caches it.

const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
const MODEL = "Xenova/whisper-base.en";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Asr = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<any>;
let loading: Promise<Asr> | null = null;

function load(onStatus: (s: string) => void): Promise<Asr> {
  if (loading) return loading;
  loading = (async () => {
    onStatus("Loading the free speech model…");
    const url = LIB;
    const T = await import(/* webpackIgnore: true */ url);
    const seen: Record<string, number> = {};
    const asr = await T.pipeline("automatic-speech-recognition", MODEL, {
      progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status === "progress" && p.file && p.total) {
          seen[p.file] = (p.loaded ?? 0) / p.total;
          const vals = Object.values(seen);
          const pct = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
          onStatus(`Downloading the free speech model (first time only)… ${pct}%`);
        }
      },
    });
    return asr as Asr;
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

async function toMono16k(blob: Blob): Promise<Float32Array> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (buf.numberOfChannels === 1) return buf.getChannelData(0);
    const a = buf.getChannelData(0);
    const b = buf.getChannelData(1);
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2;
    return out;
  } finally {
    ctx.close().catch(() => undefined);
  }
}

// Whisper makes up short phrases when the audio is silent. Drop them.
const GHOSTS = /^((you|thank you|thanks for watching|thanks|bye|okay|oh|uh|um|hmm|so|the|\.+)[.!?, ]*)+$/i;

export async function transcribeInBrowser(blob: Blob, onStatus: (s: string) => void): Promise<string> {
  const [asr, raw] = await Promise.all([load(onStatus), toMono16k(blob)]);
  // measure loudness
  let peak = 0;
  for (let i = 0; i < raw.length; i++) {
    const a = Math.abs(raw[i]);
    if (a > peak) peak = a;
  }
  // rms = average loudness. Real speech is clearly above room noise.
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum += raw[i] * raw[i];
  const rms = Math.sqrt(sum / Math.max(1, raw.length));
  if (peak < 0.03 || rms < 0.004) throw new Error(`the recording is too quiet (peak ${peak.toFixed(3)})`);
  const gain = Math.min(6, 0.8 / peak); // small boost only. Big boosts turn noise into fake words
  const audio = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) audio[i] = raw[i] * gain;
  onStatus("Turning your voice into text…");
  const out = await asr(audio, { chunk_length_s: 30 });
  const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out?.text;
  const clean = String(text ?? "").replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim(); // drop tags like [BLANK_AUDIO]
  return GHOSTS.test(clean) ? "" : clean;
}
