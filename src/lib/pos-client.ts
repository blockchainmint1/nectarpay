// Browser-side HMAC helpers for the POS terminal app.
// Uses SubtleCrypto so it works in the Worker SSR runtime AND modern Chrome.

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

async function sign(secretHex: string, body: string, ts: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(secretHex),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${body}`));
  return bytesToHex(new Uint8Array(sig));
}

export interface TerminalCreds {
  terminalId: string;
  secret: string;
  apiBase: string;
}

export function loadCreds(): TerminalCreds | null {
  if (typeof window === "undefined") return null;
  const terminalId = localStorage.getItem("pos.terminal.id");
  const secret = localStorage.getItem("pos.terminal.secret");
  const apiBase = localStorage.getItem("pos.terminal.apiBase") || window.location.origin;
  if (!terminalId || !secret) return null;
  return { terminalId, secret, apiBase };
}

export function saveCreds(creds: TerminalCreds) {
  localStorage.setItem("pos.terminal.id", creds.terminalId);
  localStorage.setItem("pos.terminal.secret", creds.secret);
  localStorage.setItem("pos.terminal.apiBase", creds.apiBase);
}

export function clearCreds() {
  localStorage.removeItem("pos.terminal.id");
  localStorage.removeItem("pos.terminal.secret");
  localStorage.removeItem("pos.terminal.apiBase");
}

export async function signedFetch(
  creds: TerminalCreds,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<Response> {
  const method = init.method ?? "GET";
  const body = init.body == null ? "" : JSON.stringify(init.body);
  const ts = String(Date.now());
  const sig = await sign(creds.secret, body, ts);
  const headers: Record<string, string> = {
    "X-Terminal-Id": creds.terminalId,
    "X-Timestamp": ts,
    "X-Signature": sig,
  };
  if (body) headers["Content-Type"] = "application/json";
  return fetch(`${creds.apiBase}${path}`, {
    method,
    headers,
    body: body || undefined,
  });
}

export async function signedJson<T = unknown>(
  creds: TerminalCreds,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const res = await signedFetch(creds, path, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: string })?.error ?? `request failed (${res.status})`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json as T;
}
