// Shared guard for /api/public/cron/* handlers.
//
// Scheduled jobs (pg_cron) send a private shared secret in the
// `x-cron-secret` header. The secret lives in public.cron_secret, which only
// the service role can read — it is never shipped to browsers. The public
// publishable key is NOT accepted, since anyone can see it.

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function requireCronAuth(request: Request): Promise<Response | null> {
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!provided) return json({ error: "unauthorized" }, 401);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cron_secret")
    .select("secret")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data?.secret) return json({ error: "cron auth not configured" }, 500);
  if (!timingSafeStringEqual(provided, data.secret)) return json({ error: "unauthorized" }, 401);
  return null;
}
