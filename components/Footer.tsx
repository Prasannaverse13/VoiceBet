import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="muted" style={{ fontSize: 14, marginTop: 14, maxWidth: 260 }}>
              Say the bet. Your agent does the rest. Built for the UBC Hackathon 2026.
            </p>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="/agent">Agent console</a></li>
              <li><a href="/#how">How it works</a></li>
              <li><a href="/#features">Features</a></li>
              <li><a href="/#ask">Voice commands</a></li>
            </ul>
          </div>
          <div>
            <h5>Stack</h5>
            <ul>
              <li><a href="https://solana.com" target="_blank" rel="noreferrer">Solana</a></li>
              <li><a href="https://developer.gemini.com" target="_blank" rel="noreferrer">Gemini Markets</a></li>
              <li><a href="https://www.quicknode.com/streams" target="_blank" rel="noreferrer">QuickNode Streams</a></li>
              <li><a href="https://elevenlabs.io" target="_blank" rel="noreferrer">ElevenLabs</a></li>
            </ul>
          </div>
          <div>
            <h5>Safety</h5>
            <ul>
              <li><a href="/#safety">Spend limits</a></li>
              <li><a href="/#safety">Kill switch</a></li>
              <li><a href="/#safety">Onchain receipts</a></li>
            </ul>
          </div>
          <div>
            <h5>Connect</h5>
            <ul>
              <li><a href="https://github.com/Prasannaverse13/VoiceBet" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="https://x.com/" target="_blank" rel="noreferrer">X</a></li>
              <li><a href="https://ubc-hackathon-2026.devpost.com/" target="_blank" rel="noreferrer">Devpost</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 VoiceBet. Testnet demo. Not financial advice.</span>
          <span>Made with care in Chennai</span>
        </div>
      </div>
    </footer>
  );
}
