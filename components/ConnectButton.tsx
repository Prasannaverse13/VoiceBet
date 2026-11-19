"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wallet, Arrow } from "./Icons";
import { signInWithMetaMask } from "@/lib/wallet";

type Props = { size?: "sm" | "md" | "lg"; tone?: "dark" | "light"; label?: string };

export default function ConnectButton({ size = "md", tone = "dark", label = "Connect wallet" }: Props) {
  const [me, setMe] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "connect" | "done">("idle");
  const [msg, setMsg] = useState<React.ReactNode>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.address ?? null))
      .catch(() => setMe(null));
  }, []);

  const cls = `btn ${tone === "dark" ? "btn-dark" : "btn-light"} ${size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : ""}`;

  const say = (m: React.ReactNode, ms = 7000) => {
    setMsg(m);
    setTimeout(() => setMsg(null), ms);
  };

  async function go() {
    setStep("connect");
    try {
      await signInWithMetaMask();
      setStep("done");
      window.location.assign("/agent"); // hard navigation so no stale redirect is reused
    } catch (e) {
      setStep("idle");
      const err = e as { code?: number; message?: string };
      if (err.message === "NO_METAMASK")
        say(
          <>
            Cannot see MetaMask on this page. Click the puzzle icon, then MetaMask, and set site access to <b>On all sites</b>. Unlock MetaMask and reload. No MetaMask yet?{" "}
            <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Install it</a>.
          </>,
          12000
        );
      else if (err.code === 4001) say("You cancelled the request in MetaMask.");
      else if (err.code === -32002) say("MetaMask already has a pending request. Click the fox icon to open it.");
      else if (err.code === 4100) say("MetaMask is locked or this site is not allowed. Unlock MetaMask and try again.");
      else say(err.message || "Could not sign in.");
    }
  }

  if (me)
    return (
      <Link href="/agent" className={cls}>
        Open dashboard <Arrow size={15} />
      </Link>
    );

  return (
    <>
      <button className={cls} onClick={go} disabled={step !== "idle"}>
        <Wallet size={size === "lg" ? 18 : 16} />
        {step === "connect" ? "Check MetaMask…" : step === "done" ? "Opening…" : label}
      </button>
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}
