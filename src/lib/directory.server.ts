// Server-only: reads the public merchant directory through the publishable key.
// The SQL function returns a safe projection (city-pin stores carry no name/contact).
import { createClient } from "@supabase/supabase-js";

export type DirectoryStore = {
  id: string;
  slug: string | null;
  listing: "full" | "online" | "city_only";
  status: "live";
  name: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  presence: "physical" | "online" | "both";
  address: {
    street: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
  };
  location: { lat: number; lng: number; precision: "exact" | "city" } | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  accepts: string[];
  updated_at: string;
};

export type DirectoryFeed = {
  generated_at: string;
  since: string | null;
  stores: DirectoryStore[];
  removed: { id: string; status: "closed" | "unlisted"; removed_at: string }[];
};

export async function loadDirectory(since: string | null): Promise<DirectoryFeed> {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb.rpc("get_public_directory", { _since: since ?? undefined });
  if (error) throw new Error(error.message);
  const feed = data as unknown as DirectoryFeed;
  // Only stores that can actually take a payment belong in a "where to spend" directory.
  const alias: Record<string, string> = { TRON: "TRX", SOL: "SOL" };
  feed.stores = (feed.stores ?? [])
    .map((s) => ({ ...s, accepts: [...new Set(s.accepts.map((c) => alias[c] ?? c))].sort() }))
    .filter((s) => s.accepts.length > 0);
  feed.removed = feed.removed ?? [];
  return feed;
}
