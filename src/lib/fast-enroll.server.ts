// Server-only: the public enrollment form's database reads.
// Both helpers run SECURITY DEFINER functions that return one scalar, so a visitor
// with no account can never read another merchant's record.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Has this coin already been assigned to a merchant? Existence only. */
export async function coinTaken(coinId: string): Promise<boolean> {
  const { data, error } = await publicClient().rpc("fast_enrollment_coin_taken", { _coin_id: coinId });
  if (error) throw new Error(error.message);
  return data === true;
}

/** How many enrollments came from this address in the last `minutes`. */
export async function enrollmentsFromIp(ip: string, minutes: number): Promise<number> {
  const { data, error } = await publicClient().rpc("fast_enrollment_ip_recent", { _ip: ip, _minutes: minutes });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}
