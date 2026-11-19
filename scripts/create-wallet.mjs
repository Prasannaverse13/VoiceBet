// Creates a devnet agent wallet at data/agent-wallet.json and asks for an airdrop.
import fs from "fs";
import path from "path";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

const file = path.join(process.cwd(), "data", "agent-wallet.json");
fs.mkdirSync(path.dirname(file), { recursive: true });

let kp;
if (fs.existsSync(file)) {
  kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  console.log("Wallet already exists.");
} else {
  kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  console.log("Created new agent wallet.");
}
console.log("Address:", kp.publicKey.toBase58());

const conn = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
try {
  const sig = await conn.requestAirdrop(kp.publicKey, 1 * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
  console.log("Airdropped 1 devnet SOL.");
} catch (e) {
  console.log("Airdrop failed (rate limit is common). Use https://faucet.solana.com instead.");
}
console.log("Next: get devnet USDC for this address at https://faucet.circle.com (pick Solana Devnet).");
