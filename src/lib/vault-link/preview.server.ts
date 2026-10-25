import { deriveBtcLikeAddress, deriveEvmAddress } from "@/lib/chains/derive.server";
import { BTC_NETWORK, TXC_NETWORK, LTC_NETWORK, DOGE_NETWORK, ETH_NETWORK } from "@/lib/chains/networks";
import type { VaultStoreChain } from "./pairing";

/** Comparison addresses are display-only, never invoice allocations or watcher inputs. */
export function vaultPreviewAddresses(keys: Partial<Record<VaultStoreChain, string>>) {
  const nets = { btc: BTC_NETWORK, txc: TXC_NETWORK, ltc: LTC_NETWORK, doge: DOGE_NETWORK } as const;
  return (Object.entries(keys) as [VaultStoreChain, string][]).map(([chain, xpub]) => {
    const derive = (index: number) => chain === "eth"
      ? deriveEvmAddress(xpub, ETH_NETWORK, index)
      : deriveBtcLikeAddress(xpub, nets[chain], index);
    return {
      chain,
      address: derive(1),
      comparisonAddress: chain === "txc" || chain === "eth" ? derive(0) : null,
    };
  });
}