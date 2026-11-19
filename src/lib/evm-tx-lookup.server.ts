// Live lookup of an EVM transaction hash across every EVM network we know
// (including retired ones), so "Verify payment" can say where a payment
// actually landed even when NectarPay never recorded it — e.g. a shopper
// sending USDT on BNB Chain to a store's Ethereum address.
import {
  BASE_NETWORK,
  BSC_NETWORK,
  ETH_NETWORK,
  ZCU_NETWORK,
  type EvmNetwork,
} from "./chains/networks";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface EvmTransferHit {
  chain: string;
  networkName: string;
  to: string;
  amount: string;
  symbol: string;
  blockTime: string | null;
  success: boolean;
  explorer: string;
}

interface RawLog {
  address: string;
  topics: string[];
  data: string;
}

function formatUnits(raw: bigint, decimals: number): string {
  const neg = raw < 0n;
  const v = neg ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

/** Pure: turn a receipt's logs + the tx's native value into credited transfers. */
export function parseEvmTransfers(
  net: EvmNetwork,
  tx: { to: string | null; value: string },
  logs: RawLog[],
): { to: string; amount: string; symbol: string }[] {
  const out: { to: string; amount: string; symbol: string }[] = [];
  const native = BigInt(tx.value || "0x0");
  if (native > 0n && tx.to) {
    out.push({
      to: tx.to.toLowerCase(),
      amount: formatUnits(native, 18),
      symbol: net.symbol === "zcu" ? "ZCU" : net.symbol === "bsc" ? "BNB" : "ETH",
    });
  }
  for (const l of logs) {
    if (l.topics?.[0]?.toLowerCase() !== TRANSFER_TOPIC || l.topics.length < 3) continue;
    const token = net.stables.find((s) => s.address.toLowerCase() === l.address.toLowerCase());
    if (!token) continue; // only report tokens we recognise; unknown contracts prove nothing
    const to = "0x" + l.topics[2].slice(-40).toLowerCase();
    out.push({ to, amount: formatUnits(BigInt(l.data || "0x0"), token.decimals), symbol: token.symbol });
  }
  return out;
}

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result ?? null;
}

/** Look the hash up on Ethereum, Base, BNB Chain and ZCU in parallel. */
export async function lookupEvmTxEverywhere(hash: string): Promise<EvmTransferHit[]> {
  const key = process.env["ALCHEMY_API_KEY"] ?? "";
  const targets: { net: EvmNetwork; url: string }[] = [
    { net: ETH_NETWORK, url: key ? ETH_NETWORK.rpcUrl(key) : "https://ethereum-rpc.publicnode.com" },
    { net: BASE_NETWORK, url: key ? BASE_NETWORK.rpcUrl(key) : "https://mainnet.base.org" },
    // BNB Chain is retired for new sales, so use a free public node, not Alchemy.
    { net: BSC_NETWORK, url: "https://bsc-dataseed.binance.org" },
    { net: ZCU_NETWORK, url: ZCU_NETWORK.rpcUrl("") },
  ];
  const results = await Promise.all(
    targets.map(async ({ net, url }) => {
      try {
        const receipt = (await rpc(url, "eth_getTransactionReceipt", [hash])) as
          | { status: string; logs: RawLog[]; blockNumber: string; blockTimestamp?: string }
          | null;
        if (!receipt) return [];
        const tx = (await rpc(url, "eth_getTransactionByHash", [hash])) as
          | { to: string | null; value: string }
          | null;
        let ts = receipt.blockTimestamp;
        if (!ts) {
          const blk = (await rpc(url, "eth_getBlockByNumber", [receipt.blockNumber, false]).catch(
            () => null,
          )) as { timestamp?: string } | null;
          ts = blk?.timestamp;
        }
        const blockTime = ts ? new Date(Number(BigInt(ts)) * 1000).toISOString() : null;
        return parseEvmTransfers(net, tx ?? { to: null, value: "0x0" }, receipt.logs ?? []).map(
          (t) => ({
            ...t,
            chain: net.symbol,
            networkName: net.name,
            blockTime,
            success: receipt.status === "0x1",
            explorer: net.explorerTx(hash),
          }),
        );
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}
