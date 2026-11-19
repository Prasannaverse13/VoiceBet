// Browser side MetaMask helpers. Sign in uses a free signed message. No gas. No funds move.

export type Eip1193 = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMetaMask?: boolean;
  providers?: Eip1193[];
  on?(event: string, cb: (...a: never[]) => void): void;
  removeListener?(event: string, cb: (...a: never[]) => void): void;
};

type Announce = { info: { rdns?: string; name?: string }; provider: Eip1193 };

export type Found = { provider: Eip1193; name: string };

/** Lists every wallet the page can see. Waits up to 1.5s because some wallets inject late. */
export async function detectWallets(): Promise<Found[]> {
  if (typeof window === "undefined") return [];
  const announced: Announce[] = [];
  const onAnnounce = (e: Event) => {
    const d = (e as CustomEvent<Announce>).detail;
    if (d?.provider && !announced.some((a) => a.provider === d.provider)) announced.push(d);
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  const ask = () => window.dispatchEvent(new Event("eip6963:requestProvider"));
  ask();
  const w = window as unknown as { ethereum?: Eip1193 };
  for (let t = 0; t < 1500; t += 150) {
    await new Promise((r) => setTimeout(r, 150));
    if (t === 300 || t === 900) ask();
    if (announced.some((a) => isMM(a))) break;
    if (t >= 450 && (announced.length || w.ethereum)) break;
  }
  window.removeEventListener("eip6963:announceProvider", onAnnounce);

  const out: Found[] = announced.map((a) => ({ provider: a.provider, name: a.info?.name || a.info?.rdns || "Wallet" }));
  const legacy = [...(w.ethereum?.providers ?? []), ...(w.ethereum ? [w.ethereum] : [])];
  for (const p of legacy) if (!out.some((o) => o.provider === p)) out.push({ provider: p, name: p.isMetaMask ? "MetaMask" : "Browser wallet" });
  return out;
}

function isMM(a: Announce) {
  const r = (a.info?.rdns || "").toLowerCase();
  return r.startsWith("io.metamask") || /metamask/i.test(a.info?.name || "");
}

/** MetaMask first. Falls back to any EVM wallet so sign in still works. */
export async function findMetaMask(): Promise<Found | null> {
  const all = await detectWallets();
  return all.find((f) => /metamask/i.test(f.name)) ?? all[0] ?? null;
}

const toHex = (s: string) => "0x" + Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, "0")).join("");

export async function signInWithMetaMask(): Promise<{ address: string; isNew: boolean; wallet: string }> {
  const found = await findMetaMask();
  if (!found) throw new Error("NO_METAMASK");
  const provider = found.provider;

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("No account selected in MetaMask.");
  const chainId = parseInt((await provider.request({ method: "eth_chainId" })) as string, 16) || 1;

  const nr = await fetch("/api/auth/nonce", { cache: "no-store" });
  const { nonce } = await nr.json();

  const message = [
    `${window.location.host} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to VoiceBet Agent. This is free. It does not move any funds.",
    "",
    `URI: ${window.location.origin}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");

  const signature = (await provider.request({ method: "personal_sign", params: [toHex(message), address] })) as string;

  const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, message, signature }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Sign in failed.");
  return { ...json, wallet: found.name };
}

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
