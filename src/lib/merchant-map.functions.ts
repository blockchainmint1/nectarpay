// Server fn exposing the public /where merchant map.
// Reads via the SECURITY DEFINER `get_merchant_map_pins()` RPC so
// anon can fetch a safe, filtered projection without hitting stores RLS.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type MapPin = {
  store_id: string;
  listing_visibility: "city_only" | "full";
  name: string | null;
  website: string | null;
  description: string | null;
  address: string | null;
  logo_url: string | null;
  category: string | null;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

export const getMerchantMapPins = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ pins: MapPin[] }> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const { data, error } = await supabase.rpc("get_merchant_map_pins");
    if (error) {
      console.error("[merchant-map] rpc error", error);
      return { pins: [] };
    }
    const pins = (data ?? [])
      .filter((r): r is NonNullable<typeof r> & { lat: number; lng: number } =>
        typeof r?.lat === "number" && typeof r?.lng === "number",
      )
      .map((r) => ({
        store_id: r.store_id as string,
        listing_visibility: r.listing_visibility as "city_only" | "full",
        name: r.name,
        website: r.website,
        description: r.description,
        address: r.address,
        logo_url: r.logo_url,
        category: r.category,
        city: r.city,
        country: r.country,
        lat: Number(r.lat),
        lng: Number(r.lng),
      }));
    return { pins };
  },
);
