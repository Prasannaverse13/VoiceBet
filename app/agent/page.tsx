"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { LogoMark } from "@/components/Logo";
import { Mic, Stop, Arrow, Shield, Power, Wallet, Eye, Bolt, Speaker, Check } from "@/components/Icons";
import type { CommandResult, Contract, FeedItem, Policy, Trade, WatchRule } from "@/lib/types";

type TradeRow = Trade & { explorer: string | null };
type WalletInfo = { configured: false; rpc: string } | { configured: true; address: string; sol: number; usdc: number; rpc: string; mint: string };
type StateResp = {
  policy: Policy;
  spentToday: number;
  trades: TradeRow[];
  rules: WatchRule[];
  feed: FeedItem[];
  wallet?: WalletInfo;
  integrations: { grok: boolean; elevenlabs: boolean; gemini: "paper" | "live"; x: boolean; quicknode: boolean };
};

const SUGGESTIONS = [
  "Put 20 USDC on a Fed rate cut if odds drop below 40",
  "Bet 10 dollars on no for Bitcoin above 150k",
  "Buy 5 USDC of yes on snow in Austin",
  "What do you think about the crypto markets?",
  "How am I doing today?",
  "Give me my daily recap",
  "Stop all trading",
];

const BARS = 28;
// Loopback devices record what the PC plays, not your voice.
const NOT_A_MIC = /stereo mix|what u hear|wave out|loopback|monitor of|virtual audio|vb-audio|cable output|voicemeeter/i;
const isRealMic = (d: MediaDeviceInfo) => !!d.label && !NOT_A_MIC.test(d.label);
const THINK = ["Reading your words", "Understanding you", "Analyzing live markets", "Preparing the answer"];
type Msg = { id: number; role: "user" | "agent"; text: string; result?: CommandResult };
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const c = (p: number) => `${Math.round(p * 100)}c`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

export default function AgentPage() {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [chat, setChat] = useState<Msg[]>([]);
  const chatRef = useRef<Msg[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<StateResp | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | undefined>();
  const [markets, setMarkets] = useState<Contract[]>([]);
  const [live, setLive] = useState(false);
  const [mktErr, setMktErr] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"feed" | "trades">("feed");
  const [levels, setLevels] = useState<number[]>(Array(BARS).fill(4));
  const [toast, setToast] = useState("");
  const [speechOk, setSpeechOk] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [stage, setStage] = useState(0);
  const [heard, setHeard] = useState(false);
  const [micError, setMicError] = useState("");
  const [silentHint, setSilentHint] = useState(false);
  const [recOnly, setRecOnly] = useState(false);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState("");

  const recRef = useRef<SR>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const errRef = useRef(false);
  const ttsRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<{ rec: MediaRecorder; chunks: Blob[] } | null>(null);
  const peakRef = useRef(0);
  const fallbackRef = useRef(false);
  const modeRef = useRef<"browser" | "recorder">("browser");
  const serverSttOk = useRef(true);
  const audioRef = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };

  const load = useCallback(async (withWallet = false) => {
    const r = await fetch(`/api/state${withWallet ? "?wallet=1" : ""}`, { cache: "no-store" });
    if (r.status === 401) {
      window.location.href = "/?signin=1";
      return;
    }
    const j: StateResp = await r.json();
    setSt(j);
    if (j.wallet) setWallet(j.wallet);
  }, []);

  const loadMarkets = useCallback(async (query = "", refresh = false) => {
    const r = await fetch(`/api/markets?q=${encodeURIComponent(query)}${refresh ? "&refresh=1" : ""}`, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setMarkets(j.markets);
    setLive(j.live);
    setMktErr(j.error ?? "");
  }, []);

  useEffect(() => {
    load(true);
    loadMarkets();
    const a = setInterval(() => load(false), 3000);
    const b = setInterval(() => load(true), 25000);
    const m = setInterval(() => loadMarkets(), 15000);
    const W = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    setSpeechOk(!!(W.SpeechRecognition || W.webkitSpeechRecognition));
    return () => {
      clearInterval(a);
      clearInterval(b);
      clearInterval(m);
    };
  }, [load, loadMarkets]);

  useEffect(() => {
    const id = setTimeout(() => loadMarkets(q), 300);
    return () => clearTimeout(id);
  }, [q, loadMarkets]);

  const refreshMics = useCallback(async () => {
    try {
      const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
      setMics(list);
      if (!list.some((d) => d.label)) return; // labels appear after mic permission
      setMicId((cur) => {
        const chosen = list.find((d) => d.deviceId === cur);
        const def = list.find((d) => d.deviceId === "default");
        const needsPick = cur ? !chosen || !isRealMic(chosen) : !!def && !isRealMic(def);
        if (!needsPick) return cur;
        const real = list.find((d) => d.deviceId !== "default" && d.deviceId !== "communications" && isRealMic(d));
        if (!real) return cur;
        try {
          localStorage.setItem("vb_mic", real.deviceId);
        } catch {
          /* storage blocked */
        }
        return real.deviceId;
      });
    } catch {
      /* not supported */
    }
  }, []);

  useEffect(() => {
    try {
      setMicId(localStorage.getItem("vb_mic") ?? "");
    } catch {
      /* storage blocked */
    }
    refreshMics();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshMics);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshMics);
  }, [refreshMics]);

  const pickMic = (id: string) => {
    setMicId(id);
    setMicError("");
    try {
      localStorage.setItem("vb_mic", id);
    } catch {
      /* storage blocked */
    }
  };

  // If the mic is on but there is no sound, say so. This is the most common problem.
  useEffect(() => {
    if (!listening) {
      setSilentHint(false);
      return;
    }
    const t = setTimeout(() => {
      if (peakRef.current < 12) setSilentHint(true);
    }, 3000);
    const c = setInterval(() => {
      if (peakRef.current >= 12) setSilentHint(false);
    }, 500);
    return () => {
      clearTimeout(t);
      clearInterval(c);
    };
  }, [listening]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat.length, busy]);

  const stopSpeaking = useCallback(() => {
    const a = ttsRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      ttsRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!voiceOn || !text) return;
      stopSpeaking();
      setSpeaking(true);
      try {
        const r = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        if (r.status === 401) {
          window.location.href = "/?signin=1";
          return;
        }
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setSpeaking(false);
          setMicError(`ElevenLabs could not speak: ${String(j.error || `server error ${r.status}`).replace(/\.$/, "")}.`);
          return;
        }
        const url = URL.createObjectURL(await r.blob());
        const audio = new Audio(url);
        ttsRef.current = audio;
        const done = () => {
          setSpeaking(false);
          ttsRef.current = null;
          URL.revokeObjectURL(url);
        };
        audio.onended = done;
        audio.onerror = done;
        await audio.play();
      } catch (e) {
        setSpeaking(false);
        setMicError(`ElevenLabs voice could not play: ${((e as Error).message || "unknown error").replace(/\.$/, "")}.`);
      }
    },
    [voiceOn, stopSpeaking]
  );

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      stopSpeaking();
      setMicError("");
      setTranscript(clean);
      const history = chatRef.current.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const userMsg: Msg = { id: Date.now(), role: "user", text: clean };
      chatRef.current = [...chatRef.current, userMsg].slice(-40);
      setChat(chatRef.current);
      setBusy(true);
      setStage(0);
      setResult(null);
      const tick = setInterval(() => setStage((n) => Math.min(n + 1, THINK.length - 1)), 650);
      const started = Date.now();
      try {
        const r = await fetch("/api/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean, history }) });
        if (r.status === 401) {
          window.location.href = "/?signin=1";
          return;
        }
        const j: CommandResult = await r.json();
        // Keep the processing view up long enough to be seen.
        const wait = 1500 - (Date.now() - started);
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
        setResult(j);
        chatRef.current = [...chatRef.current, { id: Date.now() + 1, role: "agent" as const, text: j.reply, result: j }].slice(-40);
        setChat(chatRef.current);
        setTranscript("");
        speak(j.reply);
        load(j.trade ? true : false);
      } catch {
        notify("Agent did not respond. Is the server running?");
      } finally {
        clearInterval(tick);
        setBusy(false);
      }
    },
    [load, speak, stopSpeaking]
  );

  const stopMeter = () => {
    const a = audioRef.current;
    if (a) {
      cancelAnimationFrame(a.raf);
      a.stream.getTracks().forEach((t) => t.stop());
      a.ctx.close().catch(() => undefined);
      audioRef.current = null;
    }
    setLevels(Array(BARS).fill(4));
  };

  /** Asks for the mic. Starts the level meter and a recording (the backup when browser voice typing fails). */
  const startMeter = async (): Promise<boolean> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: micId ? { deviceId: { exact: micId }, echoCancellation: false, noiseSuppression: true, autoGainControl: true } : { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const name = (e as { name?: string }).name;
      setMicError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "The browser blocked the microphone. Click the lock icon in the address bar and allow the mic. Then try again."
          : name === "NotFoundError"
          ? "No microphone found. Plug one in or pick one in Windows sound settings."
          : "Could not open the microphone. Close other apps that use it and try again."
      );
      return false;
    }
    peakRef.current = 0;
    refreshMics(); // labels are only visible after permission
    const ctx = new AudioContext();
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 128;
    src.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => {
      an.getByteFrequencyData(data);
      const out: number[] = [];
      for (let i = 0; i < BARS; i++) {
        const v = data[Math.min(data.length - 1, 2 + Math.floor((i / BARS) * 40))];
        if (v > peakRef.current) peakRef.current = v;
        out.push(4 + (v / 255) * 40);
      }
      setLevels(out);
      if (audioRef.current) audioRef.current.raf = requestAnimationFrame(tick);
    };
    audioRef.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    recorderRef.current = null;
    if (typeof MediaRecorder !== "undefined") {
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.start(250);
      recorderRef.current = { rec, chunks };
    }
    return true;
  };

  const stopRecorder = () =>
    new Promise<Blob | null>((resolve) => {
      const r = recorderRef.current;
      recorderRef.current = null;
      if (!r) return resolve(null);
      const done = () => resolve(new Blob(r.chunks, { type: r.rec.mimeType || "audio/webm" }));
      if (r.rec.state === "inactive") return done();
      r.rec.onstop = done;
      r.rec.stop();
    });

  const goRecorderOnly = () => {
    fallbackRef.current = true;
    setRecOnly(true);
    setTranscript("Listening… tap Stop when you finish.");
  };

  /** Ends a listening turn. Uses browser words when there are some. Otherwise transcribes the recording. */
  const finish = async (browserText: string) => {
    setListening(false);
    setHeard(false);
    setRecOnly(false);
    const blob = await stopRecorder();
    stopMeter();
    if (browserText) {
      send(browserText);
      return;
    }
    setTranscript("");
    if (!blob || blob.size < 2500) {
      setMicError(
        "I did not hear anything. Pick another microphone below and try again."
      );
      return;
    }
    setBusy(true);
    setStage(0);
    setTranscript("Transcribing your voice…");
    let text = "";
    let serverErr = "";

    // ElevenLabs speech to text (server)
    try {
      const fd = new FormData();
      fd.append("audio", blob, blob.type.includes("mp4") ? "voice.mp4" : "voice.webm");
      const r = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (r.status === 401) {
        window.location.href = "/?signin=1";
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (r.ok) text = String(j.text ?? "").trim();
      else serverErr = j.error || `server error ${r.status}`;
    } catch {
      serverErr = "could not reach the server";
    }
    if (serverErr) {
      setBusy(false);
      setTranscript("");
      setMicError(`ElevenLabs could not read your voice: ${serverErr.replace(/\.$/, "")}. Check ELEVENLABS_API_KEY in .env then restart npm run dev.`);
      return;
    }

    setBusy(false);
    if (text) send(text);
    else {
      setTranscript("");
      setMicError("I did not catch any words. Try again a little closer to the mic.");
    }
  };

  const toggleMic = async () => {
    if (listening) {
      if (recRef.current && !fallbackRef.current) recRef.current.stop(); // its onend finishes the turn
      else finish("");
      return;
    }
    const W = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    stopSpeaking();
    setMicError("");
    setResult(null);
    setTranscript("");
    finalRef.current = "";
    interimRef.current = "";
    fallbackRef.current = false;
    setHeard(false);
    setRecOnly(false);

    if (!(await startMeter())) return;
    setListening(true);

    goRecorderOnly(); // ElevenLabs only: we record and send the audio to ElevenLabs
    return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onspeechstart = () => setHeard(true);
    rec.onresult = (e: SR) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t;
        else interim += t;
      }
      interimRef.current = interim;
      setHeard(true);
      setTranscript((finalRef.current + " " + interim).trim());
    };
    rec.onerror = (e: SR) => {
      if (e.error === "aborted" || e.error === "no-speech") return; // onend handles these
      if (["network", "service-not-allowed", "language-not-supported"].includes(e.error)) {
        modeRef.current = "recorder";
        goRecorderOnly();
        setMicError("Browser voice typing is not working here. I switched to recorder mode. Keep talking then tap Stop and send.");
        return;
      }
      setMicError(e.error === "not-allowed" ? "The browser blocked voice typing. Allow the microphone in the address bar and try again." : `Mic error: ${e.error}`);
    };
    rec.onend = () => {
      if (fallbackRef.current) return; // keep recording for the backup path
      finish((finalRef.current || interimRef.current).trim());
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      modeRef.current = "recorder";
      goRecorderOnly();
    }
  };

  const updatePolicy = async (patch: Partial<Policy>) => {
    if (st) setSt({ ...st, policy: { ...st.policy, ...patch } });
    await fetch("/api/policy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    load();
  };

  const cancelRule = async (id: string) => {
    await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
    notify("Watch rule cancelled");
    load();
  };

  const resetAll = async () => {
    await fetch("/api/reset", { method: "POST" });
    setResult(null);
    setTranscript("");
    notify("Demo state reset");
    load(true);
  };

  const p = st?.policy;
  const spent = st?.spentToday ?? 0;
  const pct = p ? Math.min(100, (spent / Math.max(1, p.dailyCapUsdc)) * 100) : 0;
  const activeRules = st?.rules.filter((r) => r.active) ?? [];
  const priced = result?.contract ? (result.intent.outcome === "no" ? result.contract.noAsk : result.contract.yesAsk) : undefined;

  return (
    <div className="console-bg">
      <Nav console />
      <div className="container console">
        {/* LEFT */}
        <div>
          {p?.killSwitch && (
            <div className="banner">
              <Power size={18} /> Kill switch is on. The agent will not trade.
              <button className="btn btn-sm btn-light" style={{ marginLeft: "auto" }} onClick={() => updatePolicy({ killSwitch: false })}>Resume</button>
            </div>
          )}

          <div className="panel talk">
            <h1>{listening ? "I'm listening…" : busy ? "Thinking…" : speaking ? "Speaking…" : "What should I trade?"}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              {listening
                ? recOnly
                  ? "Recording. Tap Stop and send when you are done."
                  : heard
                  ? "I can hear you. Tap Stop when you are done."
                  : "Mic is on. Waiting for your voice…"
                : busy
                ? "Hang on. The agent is working on it."
                : speaking
                ? "Tap Stop to silence the voice."
                : speechOk
                ? "Tap the orb and speak."
                : "Voice needs Chrome or Edge. You can type below."}
            </p>
            <div className="orb-wrap" style={{ paddingTop: 26 }}>
              <button
                className={`orb ${listening ? "live" : busy ? "busy" : speaking ? "speak" : ""}`}
                onClick={speaking && !listening ? stopSpeaking : toggleMic}
                aria-label={listening ? "Stop listening" : speaking ? "Stop speaking" : "Start listening"}
                disabled={busy}
              >
                {busy ? (
                  <span className="think"><i /><i /><i /></span>
                ) : listening || speaking ? (
                  <Stop size={34} />
                ) : (
                  <Mic size={40} />
                )}
              </button>
            </div>
            <div className={`wave ${listening ? "" : busy || speaking ? "auto" : "idle"}`}>
              {levels.map((h, i) => (
                <i key={i} style={{ height: listening ? h : undefined, animationDelay: `${(i % 9) * 0.09}s` }} />
              ))}
            </div>
            <div className="action-row">
              {listening && (
                <button className="btn btn-danger" onClick={toggleMic}>
                  <Stop size={16} /> Stop and send
                </button>
              )}
              {speaking && !listening && !busy && (
                <button className="btn btn-light" onClick={stopSpeaking}>
                  <Stop size={16} /> Stop speaking
                </button>
              )}
            </div>
            <div className={`transcript ${transcript ? "" : "placeholder"}`}>{transcript || "Your words will show up here"}</div>
            {micError && <div className="mic-error" role="alert">{micError}</div>}
            {silentHint && listening && (
              <div className="mic-warn" role="status">
                Mic is on but I hear no sound. Pick another microphone below while I keep listening, or tap Stop and try again.
              </div>
            )}
            <div className="mic-pick">
              <label htmlFor="mic">Microphone</label>
              <select id="mic" value={micId} onChange={(e) => pickMic(e.target.value)} disabled={listening || busy}>
                <option value="">Browser default</option>
                {mics.filter((m) => m.deviceId && m.deviceId !== "default" && m.deviceId !== "communications").map((m, i) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {(m.label || `Microphone ${i + 1}`) + (m.label && !isRealMic(m) ? " (not a mic: records PC sound)" : "")}
                  </option>
                ))}
              </select>
              {micId && <span className="muted" style={{ fontSize: 12 }}>Uses recorder mode</span>}
            </div>
            {(() => {
              const sel = mics.find((m) => m.deviceId === (micId || "default"));
              return sel && sel.label && !isRealMic(sel) ? (
                <div className="mic-error" role="alert">
                  {sel.label} is not a microphone. It records the sound your PC plays, so it cannot hear you. Pick your real mic above, for example one named Microphone or Headset.
                </div>
              ) : null;
            })()}
            {busy && (
              <div className="think-box" role="status" aria-live="polite">
                <div className="progress"><i /></div>
                <div className="think-steps">
                  {THINK.map((t, i) => (
                    <div key={t} className={`think-step ${stage > i ? "done" : stage === i ? "now" : ""}`}>
                      <span className="tick">{stage > i ? <Check size={12} /> : stage === i ? <span className="spin" /> : null}</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form
              className="input-row"
              onSubmit={(e) => {
                e.preventDefault();
                send(typed);
                setTyped("");
              }}
            >
              <input className="input" placeholder="Or type a command…" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} />
              <button className="btn btn-dark" type="submit" disabled={busy || !typed.trim()}>
                Send <Arrow size={15} />
              </button>
            </form>
            <div className="suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={busy}>{s}</button>
              ))}
            </div>

            {(chat.length > 0 || busy) && (
              <div className="thread" aria-live="polite">
                <div className="thread-head">
                  <span>Conversation</span>
                  {chat.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { chatRef.current = []; setChat([]); setResult(null); }}>Clear</button>
                  )}
                </div>
                {chat.map((m, idx) => (
                  <div key={m.id} className={`bubble-row ${m.role}`}>
                    {m.role === "agent" && <span className="reply-avatar"><LogoMark size={28} /></span>}
                    <div className={`bubble ${m.role}`}>
                      <div>{m.text}</div>
                      {m.role === "agent" && m.result && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          <span className="chip gray">{m.result.intent.action === "ask" ? "answer" : m.result.intent.action}</span>
                          <span className="chip blue">
                            {m.result.intent.action === "ask"
                              ? m.result.answeredBy === "grok" ? "analyzed by Grok" : "basic answer (Grok off)"
                              : m.result.intent.source === "grok" ? "parsed by Grok" : "parsed by local rules"}
                          </span>
                          {speaking && idx === chat.length - 1 ? (
                            <button className="chip no" style={{ border: 0 }} onClick={stopSpeaking}><Stop size={12} /> Stop</button>
                          ) : (
                            <button className="chip gray" style={{ border: 0 }} onClick={() => speak(m.text)}><Speaker size={12} /> Play</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="bubble-row agent">
                    <span className="reply-avatar"><LogoMark size={28} /></span>
                    <div className="bubble agent typing"><i /><i /><i /></div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
            )}

            {result && (
              <div style={{ textAlign: "left" }}>
                {(result.contract || result.trade) && (
                  <div className="plan">
                    <div className="plan-step ok">
                      <b>Intent</b>
                      {result.intent.amountUsdc ?? "-"} USDC on {(result.intent.outcome ?? "yes").toUpperCase()}
                    </div>
                    <div className={`plan-step ${result.contract ? "ok" : "bad"}`}>
                      <b>Market</b>
                      {result.contract ? `${result.contract.eventTitle} · ${result.contract.label}` : "Not found"}
                      {priced !== undefined && <div className="price" style={{ marginTop: 4 }}>{c(priced)}</div>}
                    </div>
                    <div className={`plan-step ${result.policy?.ok ? "ok" : "bad"}`}>
                      <b>Policy</b>
                      {result.policy?.ok ? "Passed" : result.policy?.reasons[0] ?? "-"}
                    </div>
                    <div className={`plan-step ${result.trade?.status === "filled" ? "ok" : result.rule ? "" : "bad"}`}>
                      <b>{result.rule && !result.trade ? "Watching" : "Settlement"}</b>
                      {result.trade ? (
                        result.trade.solanaMode === "devnet" ? (
                          <a href={`https://explorer.solana.com/tx/${result.trade.solanaSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                            Solana tx ↗
                          </a>
                        ) : (
                          "Simulated (no wallet)"
                        )
                      ) : result.rule ? (
                        `Fires ${result.rule.triggerBelow !== undefined ? `below ${c(result.rule.triggerBelow)}` : `above ${c(result.rule.triggerAbove ?? 0)}`}`
                      ) : (
                        "Not sent"
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3><Bolt size={16} /> Gemini markets <span className={`chip ${live ? "yes" : "amber"}`} title={mktErr}>{live ? "live" : "demo data"}</span>
                {!live && (
                  <button className="chip gray" style={{ border: 0 }} onClick={() => loadMarkets(q, true)}>Retry</button>
                )}
              </h3>
              <input className="input" style={{ maxWidth: 220, height: 36, fontSize: 14 }} placeholder="Search markets" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {!live && mktErr && <div className="mic-warn" style={{ margin: "0 0 12px", maxWidth: "none" }}>Showing demo markets. {mktErr}.</div>}
            <div className="list">
              {markets.length === 0 && <div className="empty">No markets match.</div>}
              {markets.slice(0, 30).map((m) => (
                <div className="row" key={m.symbol}>
                  <div className="row-main">
                    <div className="t">{m.eventTitle}</div>
                    <div className="s">{m.label} · {m.category} · <span className="mono">{m.symbol}</span></div>
                  </div>
                  <button className="chip yes" style={{ border: 0 }} onClick={() => send(`Bet 10 USDC on yes for ${m.eventTitle} ${m.label}`)} title="Quick buy 10 USDC YES">
                    YES <span className="price">{c(m.yesAsk)}</span>
                  </button>
                  <button className="chip no" style={{ border: 0 }} onClick={() => send(`Bet 10 USDC on no for ${m.eventTitle} ${m.label}`)} title="Quick buy 10 USDC NO">
                    NO <span className="price">{c(m.noAsk)}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <h3><Wallet size={16} /> Agent wallet</h3>
              <span className="chip gray">Solana devnet</span>
            </div>
            <div className="stat-row">
              <div className="stat"><small>USDC</small><strong>{wallet?.configured ? wallet.usdc.toFixed(2) : "-"}</strong></div>
              <div className="stat"><small>Spent today</small><strong>{spent.toFixed(2)}</strong></div>
              <div className="stat"><small>Trades</small><strong>{st?.trades.filter((t) => t.status === "filled").length ?? 0}</strong></div>
            </div>
            <div className="bar" style={{ marginTop: 14 }}><i style={{ width: `${pct}%`, background: pct > 85 ? "var(--no)" : undefined }} /></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
              <span>{spent.toFixed(2)} of {p?.dailyCapUsdc ?? 0} USDC daily cap</span>
              {wallet?.configured && <span>{wallet.sol.toFixed(3)} SOL for fees</span>}
            </div>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              {wallet?.configured ? (
                <a className="mono" href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                  {wallet.address.slice(0, 6)}…{wallet.address.slice(-6)} ↗
                </a>
              ) : (
                <span className="muted">No wallet yet. Run <span className="mono">npm run wallet</span> to create one. Trades settle in simulated mode until then.</span>
              )}
            </div>
            {st && (
              <div className="integr" style={{ marginTop: 14 }}>
                <span className={`chip ${st.integrations.grok ? "yes" : "gray"}`}>Grok {st.integrations.grok ? "on" : "off"}</span>
                <span className={`chip ${st.integrations.elevenlabs ? "yes" : "gray"}`}>ElevenLabs {st.integrations.elevenlabs ? "on" : "browser voice"}</span>
                <span className={`chip ${st.integrations.gemini === "live" ? "yes" : "amber"}`}>Gemini {st.integrations.gemini}</span>
                <span className={`chip ${st.integrations.x ? "yes" : "gray"}`}>X {st.integrations.x ? "on" : "off"}</span>
                <span className={`chip ${st.integrations.quicknode ? "yes" : "gray"}`}>Streams</span>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3><Shield size={16} /> Spend policy</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                Kill switch
                <button className={`switch ${p?.killSwitch ? "on" : ""}`} onClick={() => p && updatePolicy({ killSwitch: !p.killSwitch })} aria-label="Toggle kill switch" />
              </div>
            </div>
            {p && (
              <>
                <label className="field">
                  <span className="field-top"><span>Daily cap</span><b>{p.dailyCapUsdc} USDC</b></span>
                  <input type="range" min={10} max={500} step={5} value={p.dailyCapUsdc} onChange={(e) => updatePolicy({ dailyCapUsdc: +e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-top"><span>Per bet max</span><b>{p.perBetMaxUsdc} USDC</b></span>
                  <input type="range" min={1} max={200} step={1} value={p.perBetMaxUsdc} onChange={(e) => updatePolicy({ perBetMaxUsdc: +e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-top"><span>Max price</span><b>{c(p.maxPrice)}</b></span>
                  <input type="range" min={0.05} max={0.99} step={0.01} value={p.maxPrice} onChange={(e) => updatePolicy({ maxPrice: +e.target.value })} />
                </label>
              </>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3><Eye size={16} /> Watch rules</h3>
              <span className="chip blue">{activeRules.length} live</span>
            </div>
            <div className="list" style={{ maxHeight: 220 }}>
              {!st?.rules.length && <div className="empty">Say a command with if or when to create one.</div>}
              {st?.rules.map((r) => (
                <div className="row" key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <div className="row-main">
                    <div className="t">{r.eventTitle}</div>
                    <div className="s">
                      {r.amountUsdc} USDC on {r.outcome.toUpperCase()} when {r.triggerBelow !== undefined ? `below ${c(r.triggerBelow)}` : `above ${c(r.triggerAbove ?? 0)}`}
                    </div>
                  </div>
                  {r.active ? (
                    <button className="btn btn-light btn-sm" onClick={() => cancelRule(r.id)}>Cancel</button>
                  ) : (
                    <span className={`chip ${r.firedTradeId ? "yes" : "gray"}`}>{r.firedTradeId ? <><Check size={12} /> Fired</> : "Cancelled"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="tabs">
                <button className={tab === "feed" ? "on" : ""} onClick={() => setTab("feed")}>Activity</button>
                <button className={tab === "trades" ? "on" : ""} onClick={() => setTab("trades")}>Trades</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-light btn-sm" onClick={() => send("Give me my daily recap")}><Speaker size={14} /> Recap</button>
                <button className={`btn btn-sm ${voiceOn ? "btn-light" : "btn-ghost"}`} onClick={() => setVoiceOn((v) => !v)} title="Toggle voice replies">
                  {voiceOn ? "Voice on" : "Muted"}
                </button>
              </div>
            </div>
            {tab === "feed" ? (
              <div className="feed">
                {!st?.feed.length && <div className="empty">Nothing yet. Say your first bet.</div>}
                {st?.feed.map((f) => (
                  <div className="feed-item" key={f.id}>
                    <time>{time(f.at)}</time>
                    <div>
                      <span className={`chip ${f.kind === "trade" ? "yes" : f.kind === "policy" || f.kind === "error" ? "no" : f.kind === "stream" ? "amber" : f.kind === "voice" ? "blue" : "gray"}`} style={{ marginRight: 6 }}>
                        {f.kind}
                      </span>
                      {f.text} {f.link && <a href={f.link} target="_blank" rel="noreferrer">View ↗</a>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="list">
                {!st?.trades.length && <div className="empty">No trades yet.</div>}
                {st?.trades.map((t) => (
                  <div className="row" key={t.id}>
                    <div className="row-main">
                      <div className="t">{t.eventTitle}</div>
                      <div className="s">
                        {t.contracts} {t.outcome.toUpperCase()} at {c(t.price)} · {t.costUsdc} USDC · {t.mode} · {time(t.at)}
                      </div>
                    </div>
                    {t.explorer ? (
                      <a className="chip yes" href={t.explorer} target="_blank" rel="noreferrer">tx ↗</a>
                    ) : (
                      <span className={`chip ${t.status === "failed" ? "no" : "gray"}`}>{t.status === "failed" ? "failed" : "sim"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={resetAll}>Reset demo</button>
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
