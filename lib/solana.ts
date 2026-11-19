import fs from "fs";
import path from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const USDC_MINT = new PublicKey(process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_DECIMALS = 6;

export function connection() {
  return new Connection(RPC, "confirmed");
}

export function agentKeypair(): Keypair | null {
  try {
    let raw = process.env.SOLANA_AGENT_SECRET;
    const file = path.join(process.cwd(), "data", "agent-wallet.json");
    if (!raw && fs.existsSync(file)) raw = fs.readFileSync(file, "utf8");
    if (!raw) return null;
    const arr = JSON.parse(raw.trim());
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    return null;
  }
}

export function explorer(sig: string) {
  const cluster = RPC.includes("devnet") ? "devnet" : RPC.includes("testnet") ? "testnet" : "mainnet-beta";
  return `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
}

export async function walletInfo() {
  const kp = agentKeypair();
  if (!kp) return { configured: false as const, rpc: RPC };
  const conn = connection();
  let sol = 0;
  let usdc = 0;
  try {
    sol = (await conn.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL;
  } catch {
    /* rpc offline */
  }
  try {
    const ata = getAssociatedTokenAddressSync(USDC_MINT, kp.publicKey);
    const bal = await conn.getTokenAccountBalance(ata);
    usdc = bal.value.uiAmount ?? 0;
  } catch {
    usdc = 0;
  }
  return { configured: true as const, address: kp.publicKey.toBase58(), sol, usdc, rpc: RPC, mint: USDC_MINT.toBase58() };
}

/**
 * Moves the stake in USDC from the agent wallet to the escrow wallet
 * and writes a memo so every bet has a public onchain receipt.
 */
export async function stakeOnchain(amountUsdc: number, memo: string): Promise<{ sig: string; mode: "devnet" | "simulated"; note?: string }> {
  const kp = agentKeypair();
  if (!kp) return { sig: `sim_${Date.now().toString(36)}`, mode: "simulated", note: "No agent wallet set. Run npm run wallet." };
  const conn = connection();
  const escrow = process.env.ESCROW_WALLET ? new PublicKey(process.env.ESCROW_WALLET) : kp.publicKey;
  const tx = new Transaction();
  let note: string | undefined;

  try {
    const fromAta = getAssociatedTokenAddressSync(USDC_MINT, kp.publicKey);
    const bal = await conn.getTokenAccountBalance(fromAta).catch(() => null);
    const have = bal?.value.uiAmount ?? 0;
    if (have >= amountUsdc) {
      const toAta = getAssociatedTokenAddressSync(USDC_MINT, escrow);
      tx.add(createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, toAta, escrow, USDC_MINT));
      tx.add(
        createTransferCheckedInstruction(fromAta, USDC_MINT, toAta, kp.publicKey, BigInt(Math.round(amountUsdc * 10 ** USDC_DECIMALS)), USDC_DECIMALS)
      );
    } else {
      note = `Agent wallet has ${have} USDC. Wrote memo receipt only. Get devnet USDC at faucet.circle.com.`;
    }
    tx.add(new TransactionInstruction({ keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }], programId: MEMO_PROGRAM, data: Buffer.from(memo.slice(0, 500), "utf8") }));
    const sig = await sendAndConfirmTransaction(conn, tx, [kp], { commitment: "confirmed" });
    return { sig, mode: "devnet", note };
  } catch (e) {
    return { sig: `sim_${Date.now().toString(36)}`, mode: "simulated", note: `Solana send failed: ${(e as Error).message.slice(0, 140)}. Need devnet SOL for fees.` };
  }
}
