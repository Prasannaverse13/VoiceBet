"use client";
import { useCallback, useEffect, useState } from "react";
import Logo from "./Logo";
import ConnectButton from "./ConnectButton";
import { Github, Power } from "./Icons";
import { findMetaMask, short } from "@/lib/wallet";

export default function Nav({ console: isConsole = false }: { console?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [addr, setAddr] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!isConsole) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j ? setAddr(j.address) : (window.location.href = "/?signin=1")))
      .catch(() => undefined);
  }, [isConsole]);

  // Sent here by the guard because the person was not signed in.
  useEffect(() => {
    if (isConsole || !window.location.search.includes("signin=1")) return;
    setNotice("Connect your wallet to open the dashboard.");
    window.history.replaceState({}, "", "/");
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [isConsole]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }, []);

  // If the person switches account in MetaMask, end the session.
  useEffect(() => {
    if (!isConsole || !addr) return;
    let off: (() => void) | undefined;
    findMetaMask().then((f) => {
      const p = f?.provider;
      if (!p?.on) return;
      const h = (accs: string[]) => {
        if (!accs?.[0] || accs[0].toLowerCase() !== addr.toLowerCase()) logout();
      };
      p.on("accountsChanged", h as never);
      off = () => p.removeListener?.("accountsChanged", h as never);
    });
    return () => off?.();
  }, [isConsole, addr, logout]);

  return (
    <header className={`nav ${scrolled || isConsole ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <Logo />
        {!isConsole && (
          <nav className="nav-links">
            <a href="/#how">How it works</a>
            <a href="/#features">Features</a>
            <a href="/#safety">Safety</a>
            <a href="/#ask">Commands</a>
          </nav>
        )}
        <div className="nav-right">
          <a className="btn btn-ghost btn-sm hide-sm" href="https://github.com/Prasannaverse13/VoiceBet" target="_blank" rel="noreferrer">
            <Github size={16} /> GitHub
          </a>
          {isConsole ? (
            <>
              {addr && (
                <span className="chip gray mono hide-sm" title={addr} style={{ height: 36, padding: "0 12px", fontSize: 13 }}>
                  <span className="dot" /> {short(addr)}
                </span>
              )}
              <button className="btn btn-light btn-sm" onClick={logout}>
                <Power size={15} /> Log out
              </button>
            </>
          ) : (
            <ConnectButton size="sm" />
          )}
        </div>
      </div>
      {notice && <div className="toast" role="status" style={{ bottom: "auto", top: 84 }}>{notice}</div>}
    </header>
  );
}
