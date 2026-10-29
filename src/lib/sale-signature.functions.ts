// Merchant-facing read of a captured customer signature. The sale is looked up
// with the caller's own (row-level-security scoped) client first, so a store
// team can only ever see signatures from its own sales.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signatureFileName } from "@/lib/sale-signature";
import { signatureDataUrlForRow } from "@/lib/sale-signature.server";

const Input = z.object({ invoice_id: z.string().uuid() });

export const getSaleSignature = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("invoices")
      .select("id, signature_path, signature_data_url")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Response("Sale not found", { status: 404 });

    const dataUrl = await signatureDataUrlForRow(row);
    if (!dataUrl) return { available: false as const, dataUrl: null, fileName: null };
    return { available: true as const, dataUrl, fileName: signatureFileName(row.id) };
  });
