import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { deviceTimeZone, isValidTimeZone } from "@/lib/timezone";

export const MY_TZ_KEY = ["profile-timezone"] as const;

/** The signed-in user's "show times in" choice; null means this device's zone. */
export function useMyTimeZone() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: [...MY_TZ_KEY, user?.id ?? "anon"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("timezone").eq("user_id", user!.id).maybeSingle();
      return (data?.timezone as string | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });
  const pref = q.data ?? null;
  return { pref, zone: isValidTimeZone(pref) ? pref : deviceTimeZone() };
}

/** Store business-day zones keyed by store id (null = not set). */
export function useStoreTimeZones() {
  return useQuery({
    queryKey: ["store-timezones"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, timezone");
      return Object.fromEntries((data ?? []).map((s) => [s.id, s.timezone as string | null])) as Record<string, string | null>;
    },
    staleTime: 5 * 60_000,
  });
}
