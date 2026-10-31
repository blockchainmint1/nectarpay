// Applies HME Give's signed church list. The last good list stays in the
// database (rows + raw backup), so if HME Give is unreachable we keep using it.
import { parseSignedRegistry, effectiveActive } from "./hme-give-registry";

type Result = { ok: boolean; applied?: number; error?: string; skipped?: string };

function config() {
  return {
    url: process.env.HME_GIVE_RECIPIENTS_URL?.trim() || null,
    signer: process.env.HME_GIVE_SIGNER_ADDRESS?.trim() || null,
  };
}

export async function applySignedRegistry(body: unknown): Promise<Result> {
  const { signer } = config();
  if (!signer) return { ok: false, error: "HME Give signer address is not configured" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { verifyTxcSignature } = await import("./wallet-signature.server");
  const { data: state } = await supabaseAdmin.from("hme_give_sync").select("last_issued_at").eq("id", 1).maybeSingle();
  const now = new Date().toISOString();
  const parsed = parseSignedRegistry(body, {
    signer,
    verify: (address, message, signature) => verifyTxcSignature({ address, message, signature }),
    lastIssuedAt: state?.last_issued_at ?? null,
  });
  if (!parsed.ok) {
    // A stale copy is normal when polling; not an error worth showing.
    if (parsed.error.startsWith("stale")) {
      await supabaseAdmin.from("hme_give_sync").update({ last_attempt_at: now, last_error: null }).eq("id", 1);
      return { ok: true, skipped: "already up to date" };
    }
    await supabaseAdmin.from("hme_give_sync").update({ last_attempt_at: now, last_error: parsed.error }).eq("id", 1);
    return { ok: false, error: parsed.error };
  }
  const list = parsed.list;
  const addrs = list.recipients.map((r) => r.address);
  const { data: existing } = await supabaseAdmin.from("egiving_recipients").select("address, blocked, source");
  const blocked = new Map((existing ?? []).map((r) => [r.address, r.blocked]));
  const rows = list.recipients.map((r) => ({
    address: r.address, kind: "church", name: r.name, code: r.code, city: r.city, blurb: r.blurb,
    source: "hme_give", synced_at: now,
    active: effectiveActive(r.active, blocked.get(r.address) ?? false),
  }));
  if (rows.length) {
    const { error } = await supabaseAdmin.from("egiving_recipients").upsert(rows, { onConflict: "address" });
    if (error) {
      await supabaseAdmin.from("hme_give_sync").update({ last_attempt_at: now, last_error: error.message }).eq("id", 1);
      return { ok: false, error: error.message };
    }
  }
  // Churches HME Give dropped from its list stop qualifying.
  const dropped = (existing ?? []).filter((r) => r.source === "hme_give" && !addrs.includes(r.address)).map((r) => r.address);
  if (dropped.length) await supabaseAdmin.from("egiving_recipients").update({ active: false }).in("address", dropped);
  await supabaseAdmin.from("hme_give_sync").update({
    last_issued_at: list.issuedAt, last_synced_at: now, last_attempt_at: now, last_error: null,
    recipient_count: rows.length, backup: body as never,
  }).eq("id", 1);
  return { ok: true, applied: rows.length };
}

/** Pull HME Give's published list, at most once per `minAgeSec`. Failures keep the last good list. */
export async function syncHmeGive(minAgeSec = 0): Promise<Result> {
  const { url } = config();
  if (!url) return { ok: false, skipped: "HME Give list address not configured" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (minAgeSec > 0) {
    const { data } = await supabaseAdmin.from("hme_give_sync").select("last_attempt_at").eq("id", 1).maybeSingle();
    if (data?.last_attempt_at && Date.now() - Date.parse(data.last_attempt_at) < minAgeSec * 1000) return { ok: true, skipped: "recently checked" };
  }
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HME Give list returned ${res.status}`);
    return await applySignedRegistry(await res.json());
  } catch (e) {
    const msg = `${(e as Error).message} — still using the last good list`;
    await supabaseAdmin.from("hme_give_sync").update({ last_attempt_at: new Date().toISOString(), last_error: msg }).eq("id", 1);
    return { ok: false, error: msg };
  }
}
