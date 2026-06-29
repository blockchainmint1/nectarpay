// Shared helper: update terminal last_seen_at, and refresh GeoIP when
// the source IP changed or the last lookup is older than a week.

import type { Database } from "@/integrations/supabase/types";

const GEOIP_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

export function getClientIp(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const tci = request.headers.get("true-client-ip");
  if (tci) return tci.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const fastly = request.headers.get("fastly-client-ip");
  if (fastly) return fastly.trim();
  return null;
}

type GeoLookup = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
};

async function lookupGeo(ip: string): Promise<GeoLookup | null> {
  // Try ipwho.is first — free, HTTPS, no key, no Worker rate limits.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        latitude?: number;
        longitude?: number;
        city?: string;
        country?: string;
      };
      if (data.success !== false) {
        return {
          lat: typeof data.latitude === "number" ? data.latitude : null,
          lng: typeof data.longitude === "number" ? data.longitude : null,
          city: data.city ?? null,
          country: data.country ?? null,
        };
      }
      console.warn("[geoip] ipwho.is returned success=false for", ip, data);
    } else {
      console.warn("[geoip] ipwho.is non-OK", res.status, "for", ip);
    }
  } catch (e) {
    console.warn("[geoip] ipwho.is failed for", ip, e instanceof Error ? e.message : e);
  }

  // Fallback: ipapi.co
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "NectarPay-Heartbeat/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn("[geoip] ipapi.co non-OK", res.status, "for", ip);
      return null;
    }
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
  } catch (e) {
    console.warn("[geoip] ipapi.co failed for", ip, e instanceof Error ? e.message : e);
    return null;
  }
}


/**
 * Touch last_seen_at + opportunistically refresh GeoIP for this terminal.
 * Best-effort: all failures are swallowed so the caller's main work succeeds.
 */
export async function touchTerminalSeen(
  request: Request,
  terminal: {
    id: string;
    last_seen_ip?: string | null;
    geoip_updated_at?: string | null;
  },
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getClientIp(request);
    const now = new Date();
    const update: Database["public"]["Tables"]["terminals"]["Update"] = {
      last_seen_at: now.toISOString(),
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
    await supabaseAdmin.from("terminals").update(update).eq("id", terminal.id);
  } catch {
    // best-effort
  }
}
