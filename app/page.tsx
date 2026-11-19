import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import HeroDemo from "@/components/HeroDemo";
import ConnectButton from "@/components/ConnectButton";
import { LogoMark } from "@/components/Logo";
import { Check, Shield, Bolt, Wallet, Eye, Power, Mic, Chart, Bell, Speaker, Wave } from "@/components/Icons";

const COMMANDS = [
  { when: "Mon · 9:02 AM", title: "Fed cut watch", text: "Put 20 USDC on a Fed rate cut if odds drop below 40.", tags: [["watch", "blue"], ["20 USDC", "gray"]] },
  { when: "Mon · 11:40 AM", title: "Quick buy", text: "Bet 10 dollars on no for Bitcoin above 150k.", tags: [["NO", "no"], ["filled", "yes"]] },
  { when: "Tue · 8:15 AM", title: "Morning check", text: "How am I doing today?", tags: [["status", "gray"]] },
  { when: "Tue · 2:30 PM", title: "Price limit", text: "Buy 15 USDC of yes on CPI above 3 percent at most 35 cents.", tags: [["limit 35c", "amber"]] },
  { when: "Wed · 6:00 PM", title: "Panic button", text: "Stop all trading.", tags: [["kill switch", "no"]] },
  { when: "Wed · 6:12 PM", title: "Back on", text: "Resume trading.", tags: [["resumed", "yes"]] },
  { when: "Thu · 9:00 PM", title: "End of day", text: "Give me my daily recap.", tags: [["voice recap", "blue"]] },
  { when: "Fri · 7:45 AM", title: "Weather punt", text: "Put 5 USDC on snow in Austin before New Year.", tags: [["YES", "yes"], ["5 USDC", "gray"]] },
] as const;

function CommandCard({ c }: { c: (typeof COMMANDS)[number] }) {
  return (
    <div className="cmd-card">
      <div className="cmd-meta">
        <span>{c.when}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Wave size={13} /> 0:0{(c.text.length % 7) + 2}
        </span>
      </div>
      <h4>{c.title}</h4>
      <p>{c.text}</p>
      <div className="cmd-foot">
        {c.tags.map(([t, k]) => (
          <span key={t} className={`chip ${k}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* HERO */}
        <section className="hero">
          <div className="sky" />
          <div className="cloud" style={{ width: 380, height: 90, top: 140, left: -80 }} />
          <div className="cloud" style={{ width: 300, height: 70, top: 260, right: -60, animationDuration: "55s" }} />
          <div className="container">
            <div className="hero-copy">
              <span className="pill"><span className="dot" /> Built for UBC Hackathon 2026 · Agentic Payments</span>
              <h1>
                Say the bet.
                <br />
                Your agent <span className="serif">does the rest.</span>
              </h1>
              <p className="lead">
                VoiceBet is an AI agent that holds a USDC budget on Solana and trades Gemini prediction markets for you. Just talk. It listens, checks your limits and settles every trade on chain.
              </p>
              <div className="hero-ctas">
                <ConnectButton size="lg" label="Connect wallet" />
                <a href="#how" className="btn btn-light btn-lg">See how it works</a>
              </div>
              <p className="muted" style={{ fontSize: 14, margin: "16px 0 0" }}>
                Sign in with MetaMask. It is a free signed message. No password and no gas.
              </p>
              <div className="badges">
                <span className="badge"><Shield /> Spend limits</span>
                <span className="badge"><Power /> Kill switch</span>
                <span className="badge"><Wallet /> USDC on Solana</span>
                <span className="badge"><Eye /> Onchain receipts</span>
              </div>
            </div>
            <div className="stage">
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="trust">
          <div className="container">
            <p>Powered by the stack judges trust</p>
            <div className="logos">
              <span className="logo-word">◎ Solana</span>
              <span className="logo-word">♊ Gemini</span>
              <span className="logo-word">⬡ QuickNode</span>
              <span className="logo-word">▮▮ ElevenLabs</span>
              <span className="logo-word">✕ Grok</span>
              <span className="logo-word">$ USDC</span>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" id="how">
          <div className="container center">
            <Reveal>
              <span className="eyebrow">How it works</span>
              <h2 className="h2">Three steps. <span className="serif">Zero clicks.</span></h2>
              <p className="sub">Talk like you would to a friend who trades. The agent handles the markets, the money and the math.</p>
            </Reveal>
            <div className="steps" style={{ textAlign: "left" }}>
              <Reveal delay={0}>
                <div className="step">
                  <div className="step-art">
                    <div className="orb live" style={{ width: 84, height: 84 }}><Mic size={26} /></div>
                  </div>
                  <div className="step-body">
                    <span className="step-num">1</span>
                    <h3>Speak your trade</h3>
                    <p>Say what you want, with a budget and a condition. No forms. No order books.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="step">
                  <div className="step-art">
                    <div className="mini" style={{ maxWidth: 240 }}>
                      <div className="mini-row"><span>Per bet max</span><span className="chip gray">25 USDC</span></div>
                      <div className="mini-row"><span>Daily cap</span><span className="chip gray">100 USDC</span></div>
                      <div className="mini-row"><span>Policy</span><span className="chip yes"><Check size={12} /> Pass</span></div>
                    </div>
                  </div>
                  <div className="step-body">
                    <span className="step-num">2</span>
                    <h3>Agent checks the rules</h3>
                    <p>Grok parses intent, finds the live Gemini market and runs it past your spend policy.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <div className="step">
                  <div className="step-art">
                    <div className="mini" style={{ maxWidth: 240 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: 14 }}>Settled</strong><span className="chip yes">devnet</span>
                      </div>
                      <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>VoiceBet|GEMI-FED|yes|52@0.38</div>
                      <div className="bar" style={{ marginTop: 12 }}><i style={{ width: "100%" }} /></div>
                    </div>
                  </div>
                  <div className="step-body">
                    <span className="step-num">3</span>
                    <h3>Settled and spoken back</h3>
                    <p>USDC moves on Solana with a memo receipt. ElevenLabs tells you what happened.</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ paddingBottom: 60 }}>
          <div className="container">
            <Reveal className="center">
              <span className="eyebrow">Features</span>
              <h2 className="h2">An agent you can <span className="serif">actually trust</span> with money.</h2>
            </Reveal>

            <Reveal>
              <div className="feature">
                <div className="feature-art">
                  <div className="mini">
                    <div className="pane-title"><Bolt size={14} /> Live markets</div>
                    {[
                      ["Fed cut in December", "43c", "yes"],
                      ["BTC above 150k", "22c", "yes"],
                      ["CPI above 3 percent", "37c", "yes"],
                      ["Snow in Austin", "9c", "yes"],
                    ].map(([t, p]) => (
                      <div key={t} className="mini-row"><span>{t}</span><span className="price">{p}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Real markets, real prices.</h3>
                  <p>The agent reads live events and contracts from the Gemini Prediction Markets API and matches your words to the right one.</p>
                  <ul className="checks">
                    <li><Check size={16} /> Smart market search from loose speech</li>
                    <li><Check size={16} /> Paper mode for demos, signed live orders when you are ready</li>
                    <li><Check size={16} /> Limit prices so you never overpay</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="feature flip">
                <div className="feature-art">
                  <div className="mini">
                    <div className="pane-title"><Eye size={14} /> Watch rules</div>
                    <div className="mini-row"><span>Fed cut · YES</span><span className="chip blue">below 40c</span></div>
                    <div className="mini-row"><span>SOL above 300 · YES</span><span className="chip blue">below 25c</span></div>
                    <div className="mini-row"><span>Lakers win · NO</span><span className="chip amber">above 60c</span></div>
                    <div className="mini-row"><span className="muted">QuickNode Stream</span><span className="chip yes">● live</span></div>
                  </div>
                </div>
                <div>
                  <h3>It waits so you don&apos;t have to.</h3>
                  <p>Set a condition once. QuickNode Streams pushes fresh chain data to the agent, which rechecks your rules on every batch and fires the trade the moment it hits.</p>
                  <ul className="checks">
                    <li><Check size={16} /> If and when conditions in plain speech</li>
                    <li><Check size={16} /> Stream driven, no cron jobs</li>
                    <li><Check size={16} /> Cancel any rule with one tap</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="feature">
                <div className="feature-art">
                  <div className="mini">
                    <div className="pane-title"><Wallet size={14} /> Agent wallet</div>
                    <div className="stat-row" style={{ marginTop: 12 }}>
                      <div className="stat"><small>USDC</small><strong>180.24</strong></div>
                      <div className="stat"><small>Spent today</small><strong>20</strong></div>
                      <div className="stat"><small>Trades</small><strong>3</strong></div>
                    </div>
                    <div className="bar" style={{ marginTop: 14 }}><i style={{ width: "20%" }} /></div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>20 of 100 USDC daily cap</div>
                  </div>
                </div>
                <div>
                  <h3>Stablecoins in, receipts out.</h3>
                  <p>Each stake moves USDC from the agent wallet to escrow on Solana and writes a memo that links the Gemini order. Anyone can audit it.</p>
                  <ul className="checks">
                    <li><Check size={16} /> SPL USDC transfers with memo receipts</li>
                    <li><Check size={16} /> One click explorer links</li>
                    <li><Check size={16} /> Devnet by default</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="feature flip">
                <div className="feature-art">
                  <div className="mini" style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <LogoMark size={28} />
                      <div style={{ fontSize: 14, background: "#f4f5ff", borderRadius: 14, padding: "10px 12px" }}>You made 3 trades for 44 USDC. You are up 3.10 USDC. Biggest position is yes on the Fed cut.</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="chip blue"><Speaker size={12} /> ElevenLabs</span>
                      <span className="chip gray"><Bell size={12} /> Posted by Grok bot</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3>It talks back. And posts.</h3>
                  <p>Every trade and daily recap is read aloud in a natural ElevenLabs voice. A Grok powered bot writes a short alert and posts it to X.</p>
                  <ul className="checks">
                    <li><Check size={16} /> Natural voice confirmations</li>
                    <li><Check size={16} /> Daily recap with mark to market</li>
                    <li><Check size={16} /> Grok written alerts on X</li>
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* JUST ASK */}
        <section className="section ask" id="ask">
          <div className="container center">
            <Reveal>
              <span className="eyebrow">Just ask</span>
              <h2 className="h2">Things people <span className="serif">say</span> to VoiceBet</h2>
              <p className="sub">If you can say it, the agent can trade it.</p>
            </Reveal>
          </div>
          <div className="marquee-row" style={{ marginTop: 40 }}>
            <div className="marquee">
              {[...COMMANDS, ...COMMANDS].map((c, i) => <CommandCard key={i} c={c} />)}
            </div>
          </div>
          <div className="marquee-row rev">
            <div className="marquee">
              {[...COMMANDS.slice(4), ...COMMANDS.slice(0, 4), ...COMMANDS.slice(4), ...COMMANDS.slice(0, 4)].map((c, i) => <CommandCard key={i} c={c} />)}
            </div>
          </div>
        </section>

        {/* SAFETY */}
        <section className="section" id="safety">
          <div className="container center">
            <Reveal>
              <span className="eyebrow">Safety first</span>
              <h2 className="h2">Guardrails are <span className="serif">built in.</span></h2>
              <p className="sub">Agents that move money need hard limits. VoiceBet checks every trade before a single cent leaves the wallet.</p>
            </Reveal>
            <div className="grid4" style={{ textAlign: "left" }}>
              {[
                [<Shield key="a" size={20} />, "Spend limits", "Per bet max and a daily cap that the agent can never cross."],
                [<Power key="b" size={20} />, "Kill switch", "Say stop or tap once. All trading halts right away."],
                [<Chart key="c" size={20} />, "Price ceilings", "Global and per command max prices stop bad fills."],
                [<Eye key="d" size={20} />, "Onchain audit", "Every stake has a Solana memo you can verify."],
              ].map(([icon, h, p], i) => (
                <Reveal key={i} delay={i * 90}>
                  <div className="tile">
                    <div className="tile-icon">{icon}</div>
                    <h4>{h as string}</h4>
                    <p>{p as string}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="tracks">
              <span className="track">🏆 Agentic Payments and AI</span>
              <span className="track">◎ Best use of Solana</span>
              <span className="track">♊ Gemini Prediction Markets</span>
              <span className="track">⬡ QuickNode Streams</span>
              <span className="track">▮▮ ElevenLabs</span>
              <span className="track">✕ Grok Bot</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="cta-band">
          <h2>Your next trade is <span className="serif">one sentence</span> away.</h2>
          <p>Connect MetaMask, hit the mic and say your first bet. Devnet and paper mode by default.</p>
          <div className="hero-ctas">
            <ConnectButton size="lg" tone="light" label="Connect wallet" />
            <a href="#how" className="btn btn-outline btn-lg">How it works</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
