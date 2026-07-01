// Build wallet-scannable payment URIs.
//
// For EVM stablecoins we use EIP-681 with the token contract + chainId so
// wallets like Coinbase, MetaMask, Trust, Rainbow auto-select the correct
// token and network:
//   ethereum:<tokenContract>@<chainId>/transfer?address=<recipient>&uint256=<baseUnits>
//
// For EVM native transfers:
//   ethereum:<recipient>@<chainId>?value=<wei>
//
// For BTC-like (BIP-21): bitcoin:<addr>?amount=<btc>
// For Solana (Solana Pay): solana:<addr>?amount=<amt>&spl-token=<mint>
// For Tron: tron:<addr>?amount=<amt>[&token=<contract>]
import { getNetwork, getStable, type ChainKind } from "@/lib/chains/networks";

/** Multiply a decimal amount (as number) by 10^decimals and return integer string. */
function toBaseUnits(amount: number, decimals: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  const [whole, frac = ""] = amount.toFixed(decimals).split(".");
  const combined = (whole + frac.padEnd(decimals, "0")).replace(/^0+/, "");
  return combined || "0";
}

export function buildPaymentUri(
  chain: string,
  address: string,
  amount: number | null,
  tokenSymbol: string | null,
  opts?: { multiChainEvm?: boolean },
): string {
  if (chain === "btc") return `bitcoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "txc") return `texitcoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "doge") return `dogecoin:${address}${amount ? `?amount=${amount}` : ""}`;

  if (chain === "eth" || chain === "base" || chain === "bsc") {
    const net = getNetwork(chain as ChainKind);
    const chainId = net && net.kind === "evm" ? net.chainId : undefined;

    // Flexible multi-chain EVM mode: merchant accepts the same address on
    // multiple EVM chains, so we must NOT bind the QR to a specific chainId
    // or a chain-specific token contract. Emit a bare `ethereum:<addr>` and
    // let the payer's wallet choose chain + asset. (For a native amount hint
    // we can safely add `?value=<wei>` — units are the same on every EVM chain.)
    if (opts?.multiChainEvm) {
      if (!tokenSymbol && amount) {
        const wei = toBaseUnits(amount, 18);
        return `ethereum:${address}?value=${wei}`;
      }
      return `ethereum:${address}`;
    }

    // Chain-locked: emit full EIP-681 with token contract + chainId.
    if (tokenSymbol) {
      const stable = getStable(chain as ChainKind, tokenSymbol);
      if (stable && chainId) {
        const baseUnits = amount ? toBaseUnits(amount, stable.decimals) : null;
        const target = `${stable.address}@${chainId}`;
        const qs = baseUnits
          ? `?address=${address}&uint256=${baseUnits}`
          : `?address=${address}`;
        return `ethereum:${target}/transfer${qs}`;
      }
    }
    // Native transfer.
    if (chainId && amount) {
      const wei = toBaseUnits(amount, 18);
      return `ethereum:${address}@${chainId}?value=${wei}`;
    }
    return `ethereum:${address}${chainId ? `@${chainId}` : ""}`;
  }


  if (chain === "tron") {
    const params = new URLSearchParams();
    if (amount) params.set("amount", String(amount));
    if (tokenSymbol) {
      const stable = getStable("tron", tokenSymbol);
      if (stable) params.set("token", stable.address);
    }
    const qs = params.toString();
    return `tron:${address}${qs ? `?${qs}` : ""}`;
  }

  if (chain === "sol") {
    const params = new URLSearchParams();
    if (amount) params.set("amount", String(amount));
    if (tokenSymbol) {
      const stable = getStable("sol", tokenSymbol);
      if (stable) params.set("spl-token", stable.address);
    }
    params.set("label", "Nectar-PAY");
    const qs = params.toString();
    return `solana:${address}${qs ? `?${qs}` : ""}`;
  }

  return address;
}
