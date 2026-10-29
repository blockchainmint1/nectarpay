import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { getReportBundle } from "@/lib/reports.functions";
import type { ReportBundle } from "@/lib/reports.types";
import { addDays, isValidTimeZone, zonedParts, zonedTimeToUtc } from "@/lib/timezone";
import { useMyTimeZone, useStoreTimeZones } from "@/lib/use-timezone";

export type RangeKey = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export type ReportSearch = {
  range: RangeKey;
  store?: string;
  chain?: string;
  from?: string;
  to?: string;
  compare: boolean;
};

export const REPORTS_ROUTE = "/_authenticated/reports" as const;

export function validateReportSearch(search: Record<string, unknown>): ReportSearch {
  const range = (search["range"] as RangeKey) ?? "30d";
  return {
    range: (["today", "7d", "30d", "90d", "ytd", "custom"] as const).includes(range) ? range : "30d",
    store: (search["store"] as string) || undefined,
    chain: (search["chain"] as string) || undefined,
    from: (search["from"] as string) || undefined,
    to: (search["to"] as string) || undefined,
    compare: search["compare"] === false ? false : true,
  };
}

export function resolveRange(s: ReportSearch, tz = "UTC"): { from: string; to: string } {
  const today = zonedParts(new Date(), tz).date;
  let startDay = today;
  let endDay = today;
  switch (s.range) {
    case "today":
      break;
    case "7d":
      startDay = addDays(today, -6);
      break;
    case "90d":
      startDay = addDays(today, -89);
      break;
    case "ytd":
      startDay = `${today.slice(0, 4)}-01-01`;
      break;
    case "custom":
      startDay = s.from || today;
      endDay = s.to || today;
      break;
    case "30d":
    default:
      startDay = addDays(today, -29);
      break;
  }
  return {
    from: zonedTimeToUtc(startDay, tz).toISOString(),
    to: new Date(zonedTimeToUtc(addDays(endDay, 1), tz).getTime() - 1).toISOString(),
  };
}

/** Business-day zone for reports: the chosen store's zone, else the viewer's. */
export function useReportTimeZone(): string {
  const search = useReportSearch();
  const { zone } = useMyTimeZone();
  const { data: storeZones } = useStoreTimeZones();
  const storeZone = search.store ? storeZones?.[search.store] : null;
  return isValidTimeZone(storeZone) ? storeZone : zone;
}

export function useReportSearch() {
  return useSearch({ from: REPORTS_ROUTE }) as ReportSearch;
}

export function useReportNavigate() {
  const navigate = useNavigate();
  return (patch: Partial<ReportSearch>) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }) as never });
}

export function useReportData() {
  const search = useReportSearch();
  const tz = useReportTimeZone();
  const range = useMemo(() => resolveRange(search, tz), [search, tz]);
  const fetchBundle = useServerFn(getReportBundle);

  return useQuery<ReportBundle>({
    queryKey: ["report-bundle", search.store ?? "all", search.chain ?? "all", range.from, range.to, search.compare, tz],
    queryFn: () =>
      fetchBundle({
        data: {
          storeId: search.store ?? null,
          chain: search.chain ?? null,
          from: range.from,
          to: range.to,
          compare: search.compare,
          timeZone: tz,
        },
      }) as Promise<ReportBundle>,
    staleTime: 60_000,
  });
}

export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

export function pct(current: number, prev: number | undefined | null): number | null {
  if (prev === undefined || prev === null) return null;
  if (prev === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}
