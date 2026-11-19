// BNB Chain is retired for new sales (see network-switch.ts), but shoppers
// sometimes send USDT/USDC there by mistake to a store's Ethereum address
// (same wallet, same 0x address). This quietly watches for those stablecoin
// transfers using a free public node — never Alchemy — and only for
// addresses that have an open stablecoin sale. Native BNB is ignored: no
// sale is ever priced in BNB.
import { BSC_NETWORK } from "./chains/networks";

export const BSC_PUBLIC_RPC = "https://bsc-rpc.publicnode.com";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
/** The public node rejects wide ranges; keep each request small. */
export const BSC_LOG_CHUNK = 500;
/** Never catch up further than this (~30 min of BNB Chain blocks). */
export const BSC_MAX_CATCHUP = 3000;

export interface BscStableTransfer {
  txHash: string;
  blockNum: number;
  to: string;
  asset: string;
  rawValue: string;
  decimals: number;
  isNative: false;
  blockTimeMs: number | null;
}

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp?: string;
  removed?: boolean;
}

/** Pure: keep only recognised BNB Chain stablecoin transfers to our addresses. */
export function parseBscStableLogs(logs: RawLog[], addresses: string[]): BscStableTransfer[] {
  const wanted = new Set(addresses.map((a) => a.toLowerCase()));
  const out: BscStableTransfer[] = [];
  for (const l of logs) {
    if (l.removed) continue;
    if (l.topics?.[0]?.toLowerCase() !== TRANSFER_TOPIC || l.topics.length < 3) continue;
    const token = BSC_NETWORK.stables.find((s) => s.address.toLowerCase() === l.address?.toLowerCase());
    if (!token) continue; // unknown contracts prove nothing
    const to = "0x" + l.topics[2].slice(-40).toLowerCase();
    if (!wanted.has(to)) continue;
    const raw = BigInt(l.data && l.data !== "0x" ? l.data : "0x0");
    if (raw <= 0n) continue;
    const ts = l.blockTimestamp ? Number(BigInt(l.blockTimestamp)) * 1000 : null;
    out.push({
      txHash: l.transactionHash,
      blockNum: parseInt(l.blockNumber, 16),
      to,
      asset: token.symbol,
      rawValue: raw.toString(),
      decimals: token.decimals,
      isNative: false,
      blockTimeMs: ts && Number.isFinite(ts) ? ts : null,
    });
  }
  return out;
}

/** Pure: the block range to scan this tick, capped so a stale cursor can't flood the node. */
export function bscScanRange(cursor: number | null, tip: number): { from: number; to: number } {
  const floor = Math.max(0, tip - BSC_MAX_CATCHUP);
  const from = Math.max(floor, (cursor ?? 0) - 5);
  return { from, to: tip };
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(BSC_PUBLIC_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`bsc rpc ${method} → ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`bsc rpc ${method}: ${body.error.message}`);
  return body.result as T;
}

export async function getBscTip(): Promise<number> {
  return parseInt(await rpc<string>("eth_blockNumber", []), 16);
}

export async function getBscStableTransfersTo(
  addresses: string[],
  fromBlock: number,
  toBlock: number,
): Promise<BscStableTransfer[]> {
  if (!addresses.length || toBlock < fromBlock) return [];
  const toTopics = addresses.map((a) => "0x" + "0".repeat(24) + a.toLowerCase().replace(/^0x/, ""));
  const tokens = BSC_NETWORK.stables.map((s) => s.address);
  const out: BscStableTransfer[] = [];
  for (let start = fromBlock; start <= toBlock; start += BSC_LOG_CHUNK) {
    const end = Math.min(toBlock, start + BSC_LOG_CHUNK - 1);
    const logs = await rpc<RawLog[]>("eth_getLogs", [{
      fromBlock: `0x${start.toString(16)}`,
      toBlock: `0x${end.toString(16)}`,
      address: tokens,
      topics: [TRANSFER_TOPIC, null, toTopics],
    }]);
    out.push(...parseBscStableLogs(logs ?? [], addresses));
  }
  return out;
}
