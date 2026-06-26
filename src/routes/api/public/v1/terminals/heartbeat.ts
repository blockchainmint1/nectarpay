// POST /api/public/v1/terminals/heartbeat  (HMAC-signed)
// Updates last_seen_at so the merchant can see which terminals are online.
// Also enriches last-seen IP + city/country via GeoIP for the /where map.

import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Id, X-Timestamp, X-Signature",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const GEOIP_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // weekly

/** Resolve client IP via Cloudflare / standard proxy headers. */
function getClientIp(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

type GeoLookup = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
};

/** Free, no-key GeoIP lookup. Best-effort; failures are silent. */
async function lookupGeo(ip: string): Promise<GeoLookup | null> {
  try {
    // ipapi.co — 1000 req/day free, no key required.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "NectarPay-Heartbeat/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      latitude?: number;
      longitude?: number;
      city?: string;
      country_name?: string;
    };
    return {
      lat: typeof data.latitude === "number" ? data.latitude : null,
      lng: typeof data.longitude === "number" ? data.longitude : null,
      city: data.city ?? null,
      country: data.country_name ?? null,
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/v1/terminals/heartbeat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, rawBody);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const ip = getClientIp(request);
          const now = new Date();
          const update: Database["public"]["Tables"]["terminals"]["Update"] = {
            last_seen_at: now.toISOString(),
          };

          // Refresh GeoIP if IP changed or older than weekly window
          const terminal = auth.terminal as {
            id: string;
            last_seen_ip?: string | null;
            geoip_updated_at?: string | null;
          };
          if (ip) {
            update.last_seen_ip = ip;
            const lastIp = terminal.last_seen_ip ?? null;
            const lastGeoAt = terminal.geoip_updated_at
              ? new Date(terminal.geoip_updated_at).getTime()
              : 0;
            const stale = now.getTime() - lastGeoAt > GEOIP_REFRESH_MS;
            if (ip !== lastIp || stale) {
              const geo = await lookupGeo(ip);
              if (geo) {
                update.last_seen_lat = geo.lat;
                update.last_seen_lng = geo.lng;
                update.last_seen_city = geo.city;
                update.last_seen_country = geo.country;
                update.geoip_updated_at = now.toISOString();
              }
            }
          }

          await supabaseAdmin
            .from("terminals")
            .update(update)
            .eq("id", auth.terminal.id);
          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
