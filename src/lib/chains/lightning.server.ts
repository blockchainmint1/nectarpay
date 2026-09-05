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
