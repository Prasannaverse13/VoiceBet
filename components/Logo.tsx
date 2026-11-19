import Link from "next/link";

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }}>
      <span className="logo-bars">
        <i style={{ height: 6 }} />
        <i style={{ height: 13 }} />
        <i style={{ height: 8 }} />
      </span>
    </span>
  );
}

export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="VoiceBet home">
      <LogoMark />
      VoiceBet
    </Link>
  );
}
