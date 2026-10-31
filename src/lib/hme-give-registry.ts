// HME Give owns the list of approved eGiving churches. It publishes (or pushes)
// a TXC-message-signed list; NectarPay accepts it only when the signature comes
// from the pinned HME Give signer and it is not older than the last list applied.
// Pure rules so they can be tested without the Worker runtime.

export type RegistryEntry = {
  address: string;
  name: string;
  active: boolean;
  code: string | null;
  city: string | null;
  blurb: string | null;
};

export type SignedRegistry = {
  signed_payload: string;
  signature: string;
  signer?: string;
};

export type ParsedRegistry = { issuedAt: string; recipients: RegistryEntry[] };

const ADDR = /^T[1-9A-HJ-NP-Za-km-z]{25,40}$/;
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export type Verify = (address: string, message: string, signature: string) => boolean;

export function parseSignedRegistry(
  body: unknown,
  opts: { signer: string; verify: Verify; lastIssuedAt?: string | null; now?: Date },
): { ok: true; list: ParsedRegistry } | { ok: false; error: string } {
  const b = body as Partial<SignedRegistry> | null;
  if (!b || typeof b.signed_payload !== "string" || typeof b.signature !== "string") return { ok: false, error: "missing signed_payload or signature" };
  if (!opts.verify(opts.signer, b.signed_payload, b.signature)) return { ok: false, error: "signature is not from the HME Give signer" };
  let p: { issued_at?: unknown; recipients?: unknown };
  try { p = JSON.parse(b.signed_payload); } catch { return { ok: false, error: "signed_payload is not JSON" }; }
  const issued = typeof p.issued_at === "string" ? Date.parse(p.issued_at) : NaN;
  if (!Number.isFinite(issued)) return { ok: false, error: "issued_at missing" };
  const now = (opts.now ?? new Date()).getTime();
  if (issued > now + 5 * 60_000) return { ok: false, error: "issued_at is in the future" };
  if (opts.lastIssuedAt && issued <= Date.parse(opts.lastIssuedAt)) return { ok: false, error: "stale list (not newer than the one already applied)" };
  if (!Array.isArray(p.recipients)) return { ok: false, error: "recipients missing" };
  if (p.recipients.length > 5000) return { ok: false, error: "too many recipients" };
  const seen = new Set<string>();
  const recipients: RegistryEntry[] = [];
  for (const r of p.recipients as Array<Record<string, unknown>>) {
    const address = str(r?.address, 64);
    const name = str(r?.name, 120);
    if (!address || !ADDR.test(address) || !name) return { ok: false, error: "every recipient needs a TEXITcoin address and name" };
    if (seen.has(address)) return { ok: false, error: `duplicate address ${address}` };
    seen.add(address);
    recipients.push({
      address, name,
      active: r.active !== false,
      code: str(r.code, 16)?.toUpperCase() ?? null,
      city: str(r.city, 80),
      blurb: str(r.blurb, 500),
    });
  }
  return { ok: true, list: { issuedAt: new Date(issued).toISOString(), recipients } };
}

/** A church counts only when HME Give lists it as active and our admin has not blocked it. */
export function effectiveActive(listed: boolean, blocked: boolean): boolean {
  return listed && !blocked;
}
