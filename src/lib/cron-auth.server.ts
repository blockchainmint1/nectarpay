// Shared guard for /api/public/cron/* handlers.
//
// pg_cron / external schedulers must send the Supabase publishable (anon)
// key in the `apikey` header. We compare against SUPABASE_PUBLISHABLE_KEY
// on the server (timing-safe via constant-time string compare). Returns a
// Response when the request is unauthorized; null when it should proceed.
//
// This is the canonical Lovable Cloud cron-auth pattern — no new secret
// needs minting; the anon key is already a project env var.

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function requireCronAuth(request: Request): Response | null {
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!expected) {
    // Misconfigured server — refuse rather than fail-open.
    return new Response(
      JSON.stringify({ error: "cron auth not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const provided =
    request.headers.get("apikey") ??
    request.headers.get("x-api-key") ??
    "";
  if (!provided || !timingSafeStringEqual(provided, expected)) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}
