export interface TangemScanResult {
  /** Unique card identifier (hex, ~14 chars). */
  cardId: string;
  /** Uncompressed secp256k1 public key, hex (128 or 130 chars). */
  publicKey: string;
  /** Derived Ethereum address (EIP-55 checksummed). */
  ethAddress: string;
  curve: "secp256k1";
}

export interface TangemSignInput {
  cardId: string;
  /** Same publicKey returned by scan(). */
  publicKey: string;
  /** 0x-prefixed 32-byte hex digest to sign. */
  hash: string;
}

export interface TangemSignResult {
  /** 64-byte r||s signature, 0x-prefixed hex (128 chars). No v. */
  signature: string;
}

export interface TangemPlugin {
  scan(): Promise<TangemScanResult>;
  signHash(options: TangemSignInput): Promise<TangemSignResult>;
}
