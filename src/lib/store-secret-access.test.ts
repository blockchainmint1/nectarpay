import { expect, test } from "vitest";
import { assertStoreSecretAccess } from "./store-secret-access.functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

for (const level of [0, 1, 2, 3, 4]) {
  test(`store secret operations ${level < 3 ? "deny" : "allow"} access level ${level}`, async () => {
    const client = { rpc: async () => ({ data: level, error: null }) } as unknown as SupabaseClient<Database>;
    if (level < 3) await expect(assertStoreSecretAccess(client, "store-id")).rejects.toThrow("Full store access required.");
    else await expect(assertStoreSecretAccess(client, "store-id")).resolves.toBeUndefined();
  });
}