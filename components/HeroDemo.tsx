"use client";
import { useEffect, useState } from "react";
import { Mic, Check, Shield, Bolt, Speaker } from "./Icons";

const SCRIPT = "Put 20 USDC on a Fed rate cut if odds drop below 40";
const STEPS = ["Heard you", "Found market", "Policy passed", "Settled on Solana"];
const SERIES = [52, 50, 51, 48, 47, 49, 45, 44, 46, 42, 41, 43, 39, 38];

function Spark({ upto }: { upto: number }) {
  const pts = SERIES.slice(0, Math.max(2, upto));
  const w = 300, h = 110;
  const x = (i: number) => (i / (SERIES.length - 1)) * w;
  const y = (v: number) => h - ((v - 34) / 22) * h;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h + 6}`} width="100%" height="120" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4f5bff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#4f5bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={w} y1={y(40)} y2={y(40)} stroke="#f2545b" strokeDasharray="4 5" strokeWidth="1.4" />
      <text x={w} y={y(40) - 6} textAnchor="end" fontSize="11" fill="#f2545b">trigger 40c</text>
      <path d={`${d} L${x(pts.length - 1)},${h} L0,${h} Z`} fill="url(#sg)" />
      <path d={d} fill="none" stroke="#4f5bff" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="5" fill="#fff" stroke="#4f5bff" strokeWidth="2.4" />
    </svg>
  );
}

export default function HeroDemo() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => (v + 1) % 120), 100);
    return () => clearInterval(id);
  }, []);

  const words = SCRIPT.split(" ");
  const shown = Math.min(words.length, Math.floor(t / 2.2));
  const listening = t < 30;
  const step = t < 32 ? 0 : t < 44 ? 1 : t < 56 ? 2 : t < 70 ? 3 : 4;
  const chartUpto = Math.min(SERIES.length, Math.floor((t - 20) / 3.5) + 2);
  const filled = t >= 70;

  return (
    <div className="device">
      <div className="device-pane" style={{ textAlign: "center" }}>
        <div className="pane-title" style={{ justifyContent: "center" }}>
          <span className="dot" style={{ background: listening ? "#4f5bff" : "#10b981" }} />
          {listening ? "Listening" : filled ? "Done" : "Working"}
        </div>
        <div className="orb-wrap">
          <div className={`orb ${listening ? "live" : !filled ? "busy" : ""}`} style={{ width: 96, height: 96 }} aria-hidden>
            <Mic size={30} />
          </div>
        </div>
        <div className={`wave ${listening ? "auto" : "idle"}`} style={{ height: 30, marginTop: 8 }}>
          {Array.from({ length: 22 }).map((_, i) => (
            <i key={i} style={{ animationDelay: `${(i % 7) * 0.12}s` }} />
          ))}
        </div>
        <p style={{ fontSize: 19, letterSpacing: "-0.01em", minHeight: 58, margin: "14px 8px 6px" }}>
          {shown ? words.slice(0, shown).join(" ") : <span className="muted">Tap and talk…</span>}
        </p>
        <div style={{ display: "grid", gap: 8, textAlign: "left", marginTop: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: step > i ? "#0e1116" : "#9aa1ad", transition: "color .3s" }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: step > i ? "#e7f8f1" : "#f1f2f4", color: "#10b981" }}>
                {step > i ? <Check size={13} /> : <span style={{ width: 6, height: 6, borderRadius: 9, background: "#c9ced6" }} />}
              </span>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="device-pane">
        <div className="pane-title">
          <Bolt size={14} /> Gemini market · live
        </div>
        <h4 style={{ margin: "12px 0 2px", fontSize: 18, letterSpacing: "-0.02em" }}>Fed rate decision in December</h4>
        <div className="muted" style={{ fontSize: 13 }}>Cut 25 bps · YES price</div>
        <div style={{ margin: "10px 0 6px" }}>
          <Spark upto={chartUpto} />
        </div>
        <div style={{ opacity: filled ? 1 : 0.35, transition: "opacity .4s", border: "1px solid var(--line)", borderRadius: 16, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>Receipt</strong>
            <span className={`chip ${filled ? "yes" : "gray"}`}>{filled ? "Filled" : "Waiting"}</span>
          </div>
          <div className="mini-row" style={{ padding: "6px 0" }}><span className="muted">Bought</span><span>52 YES at 38c</span></div>
          <div className="mini-row" style={{ padding: "6px 0" }}><span className="muted">Cost</span><span>19.76 USDC</span></div>
          <div className="mini-row" style={{ padding: "6px 0" }}><span className="muted">Solana tx</span><span className="mono" style={{ fontSize: 12 }}>4xQp…9fTa</span></div>
        </div>
      </div>

      <div className="float-card" style={{ left: -34, top: 70 }}>
        <Shield size={18} className="" /> <span><b>Daily cap</b> 20 of 100 USDC</span>
      </div>
      <div className="float-card" style={{ right: -28, bottom: 64, animationDelay: "1.5s" }}>
        <Speaker size={18} /> <span>Voice recap ready</span>
      </div>
    </div>
  );
}
