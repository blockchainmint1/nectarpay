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

// The wallet has existed in both bitcoinjs-message prefix conventions:
// - the current app config: "TEXITcoin Signed Message:\n"
// - older/custom-network builds: "\x18TEXITcoin Signed Message:\n"
// Accept both so deployed wallet builds can authenticate while they converge.
const TXC_MESSAGE_PREFIXES = [
  "TEXITcoin Signed Message:\n",
  "\x18TEXITcoin Signed Message:\n",
] as const;

export function verifyTxcSignature(opts: {
  address: string;
  message: string;
  signature: string;
}): boolean {
  for (const prefix of TXC_MESSAGE_PREFIXES) {
    try {
      if (
        bitcoinMessage.verify(
          opts.message,
          opts.address,
          opts.signature,
          prefix,
          true, // checkSegwitAlways — tolerates legacy, p2sh-segwit, and bech32
        )
      ) {
        return true;
      }
    } catch {
      // Try the next historical prefix variant.
    }
  }

  return false;
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
