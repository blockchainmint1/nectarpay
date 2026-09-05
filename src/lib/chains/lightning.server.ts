// Minimal LND REST client for the shared Nectar.Pay Lightning node.
//
// Configuration (server env / secrets):
//   LND_REST_URL      e.g. https://ln.nectar-pay.com:8080   (no trailing slash)
//   LND_MACAROON_HEX  hex-encoded macaroon with invoice + onchain-send rights
//
// NOTE: TLS is verified normally — the node must present a certificate that
// chains to a public CA (Caddy/Let's Encrypt in front of lnd's REST port is
// the easiest way). The Worker runtime cannot skip certificate validation.

export interface LndAddInvoiceResult {
  paymentHash: string; // hex
  paymentRequest: string; // bolt11
  expiresAt: string; // ISO
}

export interface LndInvoiceState {
  state: "OPEN" | "SETTLED" | "CANCELED" | "ACCEPTED";
  amtPaidSats: number;
  settledAt: string | null;
}

function config() {
  const base = process.env["LND_REST_URL"];
  const macaroon = process.env["LND_MACAROON_HEX"];
  if (!base || !macaroon) {
    throw new Error("Lightning node is not configured (LND_REST_URL / LND_MACAROON_HEX).");
  }
  return { base: base.replace(/\/+$/, ""), macaroon };
}

export function lightningConfigured(): boolean {
  return !!process.env["LND_REST_URL"] && !!process.env["LND_MACAROON_HEX"];
}

async function lnd<T>(path: string, init?: RequestInit): Promise<T> {
  const { base, macaroon } = config();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Grpc-Metadata-macaroon": macaroon,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LND ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`LND ${path} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

function base64ToHex(b64: string): string {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  let out = "";
  for (let i = 0; i < bin.length; i++) out += bin.charCodeAt(i).toString(16).padStart(2, "0");
  return out;
}

function hexToBase64Url(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Create a BOLT-11 invoice on the shared node. */
export async function lndAddInvoice(
  amountSats: number,
  memo: string,
  expirySeconds: number,
): Promise<LndAddInvoiceResult> {
  const res = await lnd<{ r_hash: string; payment_request: string }>("/v1/invoices", {
    method: "POST",
    body: JSON.stringify({
      value: String(Math.max(1, Math.round(amountSats))),
      memo: memo.slice(0, 400),
      expiry: String(Math.max(60, Math.round(expirySeconds))),
      private: true,
    }),
  });
  return {
    paymentHash: base64ToHex(res.r_hash),
    paymentRequest: res.payment_request,
    expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
  };
}

/** Look up an invoice by payment hash (hex). */
export async function lndLookupInvoice(paymentHashHex: string): Promise<LndInvoiceState> {
  const res = await lnd<{ state: string; amt_paid_sat: string; settle_date: string }>(
    `/v2/invoices/lookup?payment_hash=${hexToBase64Url(paymentHashHex)}`,
  );
  const settleDate = Number(res.settle_date || 0);
  return {
    state: (res.state as LndInvoiceState["state"]) ?? "OPEN",
    amtPaidSats: Number(res.amt_paid_sat || 0),
    settledAt: settleDate > 0 ? new Date(settleDate * 1000).toISOString() : null,
  };
}

/** Cancel an open invoice (used when a Nectar invoice expires/cancels). */
export async function lndCancelInvoice(paymentHashHex: string): Promise<void> {
  await lnd("/v2/invoices/cancel", {
    method: "POST",
    body: JSON.stringify({ payment_hash: hexToBase64Url(paymentHashHex) }),
  });
}

/** Confirmed on-chain wallet balance of the shared node, in sats. */
export async function lndOnchainBalanceSats(): Promise<number> {
  const res = await lnd<{ confirmed_balance: string }>("/v1/balance/blockchain");
  return Number(res.confirmed_balance || 0);
}

/** Send on-chain from the node's wallet (merchant sweep). */
export async function lndSendCoins(
  address: string,
  amountSats: number,
  satPerVbyte = 2,
): Promise<string> {
  const res = await lnd<{ txid: string }>("/v1/transactions", {
    method: "POST",
    body: JSON.stringify({
      addr: address,
      amount: String(Math.round(amountSats)),
      sat_per_vbyte: String(satPerVbyte),
      spend_unconfirmed: false,
    }),
  });
  return res.txid;
}

// ---------------------------------------------------------------------------
// Node operations (admin console)
// ---------------------------------------------------------------------------

export interface LndNodeInfo {
  alias: string;
  identityPubkey: string;
  version: string;
  syncedToChain: boolean;
  syncedToGraph: boolean;
  blockHeight: number;
  numActiveChannels: number;
  numPendingChannels: number;
  numInactiveChannels: number;
  numPeers: number;
  uris: string[];
}

export async function lndGetInfo(): Promise<LndNodeInfo> {
  const res = await lnd<Record<string, unknown>>("/v1/getinfo");
  return {
    alias: String(res["alias"] ?? ""),
    identityPubkey: String(res["identity_pubkey"] ?? ""),
    version: String(res["version"] ?? ""),
    syncedToChain: Boolean(res["synced_to_chain"]),
    syncedToGraph: Boolean(res["synced_to_graph"]),
    blockHeight: Number(res["block_height"] ?? 0),
    numActiveChannels: Number(res["num_active_channels"] ?? 0),
    numPendingChannels: Number(res["num_pending_channels"] ?? 0),
    numInactiveChannels: Number(res["num_inactive_channels"] ?? 0),
    numPeers: Number(res["num_peers"] ?? 0),
    uris: (res["uris"] as string[] | undefined) ?? [],
  };
}

export interface LndBalances {
  onchainConfirmedSats: number;
  onchainUnconfirmedSats: number;
  localSats: number;
  remoteSats: number;
  pendingOpenLocalSats: number;
}

export async function lndBalances(): Promise<LndBalances> {
  const [chain, chan] = await Promise.all([
    lnd<Record<string, string>>("/v1/balance/blockchain"),
    lnd<Record<string, unknown>>("/v1/balance/channels"),
  ]);
  const amt = (v: unknown) =>
    Number((v as { sat?: string } | undefined)?.sat ?? 0);
  return {
    onchainConfirmedSats: Number(chain["confirmed_balance"] ?? 0),
    onchainUnconfirmedSats: Number(chain["unconfirmed_balance"] ?? 0),
    localSats: amt(chan["local_balance"]),
    remoteSats: amt(chan["remote_balance"]),
    pendingOpenLocalSats: amt(chan["pending_open_local_balance"]),
  };
}

export interface LndChannelSummary {
  channelPoint: string;
  remotePubkey: string;
  active: boolean;
  capacitySats: number;
  localSats: number;
  remoteSats: number;
  private: boolean;
}

export async function lndListChannels(): Promise<LndChannelSummary[]> {
  const res = await lnd<{ channels?: Record<string, unknown>[] }>("/v1/channels");
  return (res.channels ?? []).map((c) => ({
    channelPoint: String(c["channel_point"] ?? ""),
    remotePubkey: String(c["remote_pubkey"] ?? ""),
    active: Boolean(c["active"]),
    capacitySats: Number(c["capacity"] ?? 0),
    localSats: Number(c["local_balance"] ?? 0),
    remoteSats: Number(c["remote_balance"] ?? 0),
    private: Boolean(c["private"]),
  }));
}

export async function lndPendingChannelCount(): Promise<number> {
  const res = await lnd<Record<string, unknown[]>>("/v1/channels/pending");
  return (
    (res["pending_open_channels"]?.length ?? 0) +
    (res["pending_force_closing_channels"]?.length ?? 0) +
    (res["waiting_close_channels"]?.length ?? 0)
  );
}

/** Fresh p2wkh deposit address for funding the node's on-chain wallet. */
export async function lndNewAddress(): Promise<string> {
  const res = await lnd<{ address: string }>("/v1/newaddress?type=0");
  return res.address;
}

export async function lndConnectPeer(pubkey: string, host: string): Promise<void> {
  try {
    await lnd("/v1/peers", {
      method: "POST",
      body: JSON.stringify({ addr: { pubkey, host }, perm: true }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/already connected/i.test(msg)) throw e;
  }
}

export async function lndOpenChannel(
  pubkeyHex: string,
  amountSats: number,
  satPerVbyte = 2,
): Promise<string> {
  const res = await lnd<{ funding_txid_str?: string; funding_txid_bytes?: string }>(
    "/v1/channels",
    {
      method: "POST",
      body: JSON.stringify({
        node_pubkey_string: pubkeyHex,
        local_funding_amount: String(Math.round(amountSats)),
        sat_per_vbyte: String(satPerVbyte),
        private: false,
      }),
    },
  );
  if (res.funding_txid_str) return res.funding_txid_str;
  if (res.funding_txid_bytes) {
    // returned little-endian base64
    const hex = base64ToHex(res.funding_txid_bytes);
    return (hex.match(/../g) ?? []).reverse().join("");
  }
  return "";
}
