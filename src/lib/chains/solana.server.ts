// Solana watcher via Alchemy's Solana JSON-RPC.
// Uses single-address mode: merchants paste one Solana pubkey per store;
// invoices are matched via SPL Memo containing the invoice id (first 8 chars).
//
// For each tracked address:
//   1) getSignaturesForAddress (limit 25, newest first)
//   2) getTransaction(jsonParsed) per signature
//   3) Extract native SOL transfers IN, SPL token (USDC/USDT) transfers IN, and any memo

import type { SolanaNetwork } from "./networks";

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method} → ${res.status}`);
  const data = (await res.json()) as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(`${method}: ${data.error.message}`);
  return data.result as T;
}

export async function getSolanaSlot(net: SolanaNetwork, key: string): Promise<number> {
  return rpc<number>(net.rpcUrl(key), "getSlot", [{ commitment: "confirmed" }]);
}

interface SolSig {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
  confirmationStatus?: "processed" | "confirmed" | "finalized";
}

interface SolTxJson {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: { accountIndex: number; mint: string; owner: string; uiTokenAmount: { amount: string; decimals: number } }[];
    postTokenBalances?: { accountIndex: number; mint: string; owner: string; uiTokenAmount: { amount: string; decimals: number } }[];
    logMessages?: string[];
  } | null;
  transaction: {
    message: {
      accountKeys: { pubkey: string; signer: boolean; writable: boolean }[];
      instructions: { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } }[];
    };
  };
}

export interface SolanaCredit {
  signature: string;
  slot: number;
  blockTime: number | null;
  asset: string;
  rawValue: string;
  decimals: number;
  isNative: boolean;
  memo: string | null;
  confirmations: number; // 0 or 1; we treat "confirmed" as 1
}

function extractMemo(tx: SolTxJson): string | null {
  for (const ix of tx.transaction.message.instructions ?? []) {
    if (ix.program === "spl-memo" && typeof ix.parsed === "string") return ix.parsed as string;
    if (ix.program === "spl-memo" && ix.parsed && typeof ix.parsed === "object") {
      const v = (ix.parsed as { memo?: string }).memo;
      if (v) return v;
    }
  }
  for (const log of tx.meta?.logMessages ?? []) {
    const m = log.match(/Memo \(len \d+\): "(.+)"/);
    if (m) return m[1];
  }
  return null;
}

export async function getSolanaCreditsTo(
  net: SolanaNetwork,
  key: string,
  address: string,
): Promise<SolanaCredit[]> {
  const url = net.rpcUrl(key);
  const stableMints = new Set(net.stables.map((s) => s.mint));
  const sigs = await rpc<SolSig[]>(url, "getSignaturesForAddress", [
    address,
    { limit: 25 },
  ]).catch(() => []);

  const credits: SolanaCredit[] = [];
  for (const s of sigs) {
    if (s.err) continue;
    const tx = await rpc<SolTxJson | null>(url, "getTransaction", [
      s.signature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
    ]).catch(() => null);
    if (!tx || !tx.meta || tx.meta.err) continue;

    const memo = extractMemo(tx);
    const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey);
    const idx = accountKeys.indexOf(address);
    const confs = s.confirmationStatus === "finalized" || s.confirmationStatus === "confirmed" ? 1 : 0;

    // Native SOL credit: post - pre balance increase
    if (idx >= 0) {
      const delta = (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
      if (delta > 0) {
        credits.push({
          signature: s.signature,
          slot: s.slot,
          blockTime: s.blockTime,
          asset: "SOL",
          rawValue: String(delta),
          decimals: net.decimals,
          isNative: true,
          memo,
          confirmations: confs,
        });
      }
    }

    // SPL token credits: any post balance > matching pre balance, owner === address, mint is a stable
    const pre = tx.meta.preTokenBalances ?? [];
    const post = tx.meta.postTokenBalances ?? [];
    for (const p of post) {
      if (p.owner !== address) continue;
      if (!stableMints.has(p.mint)) continue;
      const prior = pre.find((x) => x.accountIndex === p.accountIndex);
      const before = BigInt(prior?.uiTokenAmount.amount ?? "0");
      const after = BigInt(p.uiTokenAmount.amount);
      if (after > before) {
        const symbol = net.stables.find((s2) => s2.mint === p.mint)?.symbol ?? "?";
        credits.push({
          signature: s.signature,
          slot: s.slot,
          blockTime: s.blockTime,
          asset: symbol,
          rawValue: String(after - before),
          decimals: p.uiTokenAmount.decimals,
          isNative: false,
          memo,
          confirmations: confs,
        });
      }
    }
  }
  return credits;
}
