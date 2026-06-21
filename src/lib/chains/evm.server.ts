// EVM watcher via Alchemy. Uses alchemy_getAssetTransfers to fetch both native
// and ERC-20 transfers to a set of addresses since a given block.

import type { EvmNetwork } from "./networks";

interface AssetTransfer {
  blockNum: string; // hex
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: "external" | "internal" | "erc20" | "erc721" | "erc1155" | "specialnft";
  rawContract: { value: string; address: string | null; decimal: string | null };
}

async function alchemyRpc<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
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

export async function getBlockNumber(net: EvmNetwork, key: string): Promise<number> {
  const hex = await alchemyRpc<string>(net.rpcUrl(key), "eth_blockNumber", []);
  return parseInt(hex, 16);
}

export async function getTransfersTo(
  net: EvmNetwork,
  key: string,
  addresses: string[],
  fromBlock: number,
): Promise<
  {
    txHash: string;
    blockNum: number;
    from: string;
    to: string;
    asset: string;
    rawValue: string;
    decimals: number;
    isNative: boolean;
  }[]
> {
  if (addresses.length === 0) return [];
  const stableAddrs = net.stables.map((s) => s.address.toLowerCase());
  const url = net.rpcUrl(key);
  const fromHex = `0x${fromBlock.toString(16)}`;

  // alchemy_getAssetTransfers supports toAddress filter, but only one at a time.
  // Loop addresses; addresses-per-tick are typically small (per merchant store).
  const results: ReturnType<typeof getTransfersTo> extends Promise<infer R> ? R : never = [];

  for (const addr of addresses) {
    const params = [
      {
        fromBlock: fromHex,
        toAddress: addr,
        category: ["external", "erc20"],
        withMetadata: false,
        excludeZeroValue: true,
        maxCount: "0x32", // 50
        contractAddresses: undefined as undefined | string[],
      },
    ];
    const raw = await alchemyRpc<{ transfers: AssetTransfer[] }>(
      url,
      "alchemy_getAssetTransfers",
      params,
    );
    for (const t of raw.transfers) {
      const contractAddr = t.rawContract.address?.toLowerCase() ?? null;
      const isNative = t.category === "external";
      const isStable = contractAddr ? stableAddrs.includes(contractAddr) : false;
      if (!isNative && !isStable) continue;
      const symbol = isNative
        ? net.symbol.toUpperCase()
        : net.stables.find((s) => s.address.toLowerCase() === contractAddr)?.symbol ?? "?";
      const decimals = isNative
        ? 18
        : net.stables.find((s) => s.address.toLowerCase() === contractAddr)?.decimals ?? 18;
      results.push({
        txHash: t.hash,
        blockNum: parseInt(t.blockNum, 16),
        from: t.from,
        to: t.to,
        asset: symbol,
        rawValue: t.rawContract.value,
        decimals,
        isNative,
      });
    }
  }
  return results;
}
