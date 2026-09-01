// Crypto address / transaction verifier RPCs.
//   verifyCryptoLookup  — admin only, searches every merchant store.
//   verifyMyAddress     — merchant, scoped to stores the caller owns.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VerifyMatch, VerifyResult } from "./address-verify.server";

export type { VerifyMatch, VerifyResult };

const Input = z.object({ query: z.string().min(6).max(200) });

export const verifyCryptoLookup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });
    void supabaseAdmin;
    const { runVerify } = await import("./address-verify.server");
    return runVerify(data.query, null, { includeOwnerEmail: true });
  });

export const verifyMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { data: stores, error } = await context.supabase.from("stores").select("id");
    if (error) throw new Error(error.message);
    const { runVerify } = await import("./address-verify.server");
    return runVerify(data.query, (stores ?? []).map((s) => s.id));
  });
