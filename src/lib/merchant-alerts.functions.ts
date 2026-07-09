import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    telegram: z.string().trim().max(120).optional().or(z.literal("")),
    postal_code: z.string().trim().min(2).max(20),
    country: z.string().trim().min(2).max(60).default("US"),
    radius_miles: z.number().int().min(1).max(500).default(10),
  })
  .refine(
    (d) => (d.email && d.email.length > 0) || (d.telegram && d.telegram.length > 0),
    { message: "Provide an email or telegram handle" },
  );

export const subscribeMerchantAlert = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("merchant_alerts").insert({
      email: data.email || null,
      telegram: data.telegram || null,
      postal_code: data.postal_code,
      country: data.country || "US",
      radius_miles: data.radius_miles,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
