// Server-only helpers for the Tangem tap-to-pay flow (USDC on Ethereum).
//
// Tangem cards sign a raw 32-byte digest; they do NOT parse Ethereum txs.
// So the backend:
//   1. builds an unsigned EIP-1559 USDC transfer tx
//   2. computes keccak256(rlp(unsigned)) -> the digest the card signs
//   3. receives {r,s} from the card, recovers v by trying 0/1 against the
//      card's known address, and assembles the signed RLP envelope
//   4. broadcasts via Alchemy eth_sendRawTransaction
//
// All calls to Alchemy go through fetch() — no wallet/private-key material
// ever lives on the server.

import {
  createPublicClient,
  http,
  encodeFunctionData,
  serializeTransaction,
  keccak256,
  parseUnits,
  hexToBigInt,
  getAddress,
  recoverAddress,
  type Hex,
  type Address,
  type TransactionSerializableEIP1559,
} from "viem";
import { mainnet } from "viem/chains";

// USDC on Ethereum mainnet (6 decimals)
export const USDC_MAINNET: Address = "0xA0b86991c6218a36c1d19D4a2e9Eb0cE3606eB48";
export const USDC_DECIMALS = 6;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function alchemyUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY not configured");
  return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
}

export function getEthClient() {
  return createPublicClient({ chain: mainnet, transport: http(alchemyUrl()) });
}

export function usdcToUnits(amountUsdc: number | string): bigint {
  return parseUnits(String(amountUsdc), USDC_DECIMALS);
}

export interface BuildUsdcTxInput {
  fromAddress: Address;
  toAddress: Address;
  amountUnits: bigint;
  contract?: Address;
}

export interface BuiltTx {
  unsigned: TransactionSerializableEIP1559;
  digest: Hex;
  onchainNonce: number;
  estimatedGasCostWei: bigint;
  ethBalanceWei: bigint;
  usdcBalanceUnits: bigint;
}

/**
 * Build an unsigned EIP-1559 USDC transfer tx and the 32-byte digest the
 * Tangem card must sign. Also returns balance snapshots so the caller can
 * fail fast with clear errors before asking the customer to tap.
 */
export async function buildUsdcTransferTx(input: BuildUsdcTxInput): Promise<BuiltTx> {
  const contract = input.contract ?? USDC_MAINNET;
  const from = getAddress(input.fromAddress);
  const to = getAddress(input.toAddress);
  const client = getEthClient();

  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [to, input.amountUnits],
  });

  // Fetch nonce, fees, gas estimate, and balances in parallel.
  const [nonce, feeData, gasLimit, ethBalance, usdcBalance] = await Promise.all([
    client.getTransactionCount({ address: from, blockTag: "pending" }),
    client.estimateFeesPerGas(),
    client.estimateGas({ account: from, to: contract, data, value: 0n }).catch(() => 65000n),
    client.getBalance({ address: from }),
    client.readContract({
      address: contract,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [from],
    }) as Promise<bigint>,
  ]);

  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 1_500_000_000n;
  const maxFeePerGas = feeData.maxFeePerGas ?? maxPriorityFeePerGas * 2n;
  const gasLimitBuffered = (gasLimit * 12n) / 10n; // +20% headroom

  const unsigned: TransactionSerializableEIP1559 = {
    type: "eip1559",
    chainId: mainnet.id,
    nonce,
    to: contract,
    value: 0n,
    data,
    gas: gasLimitBuffered,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };

  const serialized = serializeTransaction(unsigned);
  const digest = keccak256(serialized);

  return {
    unsigned,
    digest,
    onchainNonce: nonce,
    estimatedGasCostWei: gasLimitBuffered * maxFeePerGas,
    ethBalanceWei: ethBalance,
    usdcBalanceUnits: usdcBalance,
  };
}

/**
 * Tangem returns a 64-byte {r||s} signature with no v. Recover v by trying
 * 0 and 1 against the expected signer address.
 */
export async function recoverVAndAssemble(
  unsigned: TransactionSerializableEIP1559,
  digest: Hex,
  signatureHex: string, // 128 hex chars = r(32) + s(32), with or without 0x
  expectedSigner: Address,
): Promise<{ signedRawTx: Hex; v: 0 | 1 }> {
  const clean = signatureHex.startsWith("0x") ? signatureHex.slice(2) : signatureHex;
  if (clean.length !== 128) {
    throw new Error(`Expected 64-byte signature (128 hex chars), got ${clean.length}`);
  }
  const r = ("0x" + clean.slice(0, 64)) as Hex;
  const s = ("0x" + clean.slice(64)) as Hex;
  const target = getAddress(expectedSigner);

  for (const yParity of [0, 1] as const) {
    const sig = { r, s, yParity } as const;
    let recovered: Address;
    try {
      recovered = await recoverAddress({ hash: digest, signature: sig });
    } catch {
      continue;
    }
    if (getAddress(recovered) === target) {
      const signedRawTx = serializeTransaction(unsigned, sig);
      return { signedRawTx, v: yParity };
    }
  }
  throw new Error("Signature did not recover to the expected card address");
}

export async function broadcastRawTx(signedRawTx: Hex): Promise<Hex> {
  const res = await fetch(alchemyUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendRawTransaction",
      params: [signedRawTx],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
  const j = (await res.json()) as { result?: string; error?: { message?: string } };
  if (j.error) throw new Error(j.error.message ?? "eth_sendRawTransaction failed");
  if (!j.result) throw new Error("No tx hash returned");
  return j.result as Hex;
}

/**
 * Derive an Ethereum address from an uncompressed secp256k1 public key
 * (as returned by Tangem's SCAN command, hex, 65 or 64 bytes).
 */
export function ethAddressFromPublicKey(pubKeyHex: string): Address {
  const clean = pubKeyHex.startsWith("0x") ? pubKeyHex.slice(2) : pubKeyHex;
  let bytes = clean;
  if (bytes.length === 130) bytes = bytes.slice(2); // strip 0x04 uncompressed prefix
  if (bytes.length !== 128) {
    throw new Error(`Expected uncompressed pubkey (128 hex chars), got ${bytes.length}`);
  }
  const hash = keccak256(("0x" + bytes) as Hex);
  return getAddress(("0x" + hash.slice(-40)) as Address);
}

/** Helper for JSON storage — bigints -> decimal strings. */
export function txToJson(tx: TransactionSerializableEIP1559): Record<string, unknown> {
  return {
    type: tx.type,
    chainId: tx.chainId,
    nonce: tx.nonce,
    to: tx.to,
    value: tx.value?.toString() ?? "0",
    data: tx.data,
    gas: tx.gas?.toString(),
    maxFeePerGas: tx.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
  };
}

export function txFromJson(j: Record<string, unknown>): TransactionSerializableEIP1559 {
  return {
    type: "eip1559",
    chainId: Number(j.chainId),
    nonce: Number(j.nonce),
    to: j.to as Address,
    value: hexToBigIntOrDecimal(j.value as string),
    data: j.data as Hex,
    gas: hexToBigIntOrDecimal(j.gas as string),
    maxFeePerGas: hexToBigIntOrDecimal(j.maxFeePerGas as string),
    maxPriorityFeePerGas: hexToBigIntOrDecimal(j.maxPriorityFeePerGas as string),
  };
}

function hexToBigIntOrDecimal(v: string): bigint {
  if (!v) return 0n;
  if (v.startsWith("0x")) return hexToBigInt(v as Hex);
  return BigInt(v);
}
