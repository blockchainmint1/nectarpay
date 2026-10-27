// ZCU (Zero Chill Units) watcher. ZCU is a go-ethereum fork with no
// Alchemy/indexer support, so we scan blocks over plain JSON-RPC and match
// native value transfers (tx.to) against open invoice addresses.
// Native ZCU only — no tokens.

import type { EvmNetwork } from "./networks";

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${method} → ${res.status}`);
  const data = (await res.json()) as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(`${method}: ${data.error.message}`);
  return data.result as T;
}

export async function getZcuBlockNumber(net: EvmNetwork): Promise<number> {
  return parseInt(await rpc<string>(net.rpcUrl(""), "eth_blockNumber", []), 16);
}

interface RpcBlock {
  number: string;
  timestamp: string;
  transactions: { hash: string; from: string; to: string | null; value: string }[];
}

export interface ZcuTransfer {
  txHash: string;
  blockNum: number;
  to: string;
  rawValue: string; // wei, decimal string
  blockTimeMs: number;
}

/** Scan blocks [fromBlock, toBlock] for native transfers to any of `addresses`. */
export async function getZcuTransfersTo(
  net: EvmNetwork,
  addresses: string[],
  fromBlock: number,
  toBlock: number,
): Promise<ZcuTransfer[]> {
  const want = new Set(addresses.map((a) => a.toLowerCase()));
  const out: ZcuTransfer[] = [];
  if (!want.size || toBlock < fromBlock) return out;
  const url = net.rpcUrl("");
  const BATCH = 10;
  for (let start = fromBlock; start <= toBlock; start += BATCH) {
    const nums: number[] = [];
    for (let n = start; n <= Math.min(toBlock, start + BATCH - 1); n++) nums.push(n);
    const blocks = await Promise.all(
      nums.map((n) => rpc<RpcBlock | null>(url, "eth_getBlockByNumber", [`0x${n.toString(16)}`, true])),
    );
    for (const b of blocks) {
      if (!b) continue;
      const blockNum = parseInt(b.number, 16);
      const blockTimeMs = parseInt(b.timestamp, 16) * 1000;
      for (const tx of b.transactions) {
        if (!tx.to || !want.has(tx.to.toLowerCase())) continue;
        const wei = BigInt(tx.value);
        if (wei === 0n) continue;
        out.push({ txHash: tx.hash, blockNum, to: tx.to, rawValue: wei.toString(), blockTimeMs });
      }
    }
  }
  return out;
}
