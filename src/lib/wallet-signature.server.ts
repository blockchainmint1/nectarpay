/**
 * TXC wallet signature verification.
 *
 * TEXITcoin is a Bitcoin-derivative. We verify Bitcoin-style message
 * signatures (magic-prefix + recoverable ECDSA, base64) using bitcoinjs-message.
 *
 * SPEC (confirm with TXC wallet team before launch):
 *   - Magic prefix: \x18TEXITcoin Signed Message:\n   (matches `signmessage` RPC)
 *   - Address: P2PKH base58 (legacy) — bech32 segwit support TBD
 *   - Message format: the raw nonce string (we hand the wallet the exact bytes to sign)
 *
 * To swap the spec later, this is the only file that needs to change.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — bitcoinjs-message ships no types
import bitcoinMessage from "bitcoinjs-message";

export { buildSignableMessage } from "@/lib/wallet-auth-shared";

const TXC_MESSAGE_PREFIX = "\x18TEXITcoin Signed Message:\n";

export function verifyTxcSignature(opts: {
  address: string;
  message: string;
  signature: string;
}): boolean {
  try {
    return bitcoinMessage.verify(
      opts.message,
      opts.address,
      opts.signature,
      TXC_MESSAGE_PREFIX,
      true, // checkSegwitAlways — tolerates both legacy and segwit
    );
  } catch (err) {
    console.error("[wallet-signature] verify threw:", err);
    return false;
  }
}

/**
 * Basic TXC address sanity check. Real validation happens via signature
 * verification (a bad address won't recover to the signature).
 */
export function looksLikeTxcAddress(addr: string): boolean {
  if (typeof addr !== "string") return false;
  if (addr.length < 26 || addr.length > 64) return false;
  // base58 + bech32 character set
  return /^[a-zA-Z0-9]+$/.test(addr);
}
