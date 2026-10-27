// Merchant reports: authenticated aggregation endpoints.
//
// Reads run through the caller's Supabase client, so RLS + store-team access
// levels decide which stores and invoices are visible. Nothing wallet-related
// is exposed here.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReportFilters } from "./reports.types";

export type { ReportFilters } from "./reports.types";
export type { ReportBundle } from "./reports.types";

export const getReportBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ReportFilters) => data)
  .handler(async ({ data, context }) => {
    const { computeReports } = await import("./reports.server");
    return computeReports(context.supabase as never, data);
  });
