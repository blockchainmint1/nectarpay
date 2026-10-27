import { HME_SITE, hmeEventBody } from "./hme-protocol";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function reportHmeSignup(admin: SupabaseClient<Database>, userId: string, email: string, ref: string | null) {
  const secret = process.env["HME_ECOSYSTEM"];
  if (!secret) return false;
  const { error: insertError } = await admin.from("hme_signup_events").upsert({ user_id: userId, ref }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) return false;
  const { data: event, error } = await admin.from("hme_signup_events").select("sent_at, ref").eq("user_id", userId).single();
  if (error || !event) return false;
  if (event.sent_at) return true;
  const { data: identity } = await admin.from("hme_member_links").select("member_id").eq("user_id", userId).maybeSingle();
  try {
    const response = await fetch("https://honest.money/api/public/hub/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}`, "X-HME-Site": HME_SITE },
      body: JSON.stringify(hmeEventBody(email, event.ref, identity?.member_id)),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) { console.warn("[hme-signup] delivery rejected", response.status); return false; }
    const { error: saveError } = await admin.from("hme_signup_events").update({ sent_at: new Date().toISOString() }).eq("user_id", userId);
    return !saveError;
  } catch { console.warn("[hme-signup] delivery unavailable"); return false; }
}