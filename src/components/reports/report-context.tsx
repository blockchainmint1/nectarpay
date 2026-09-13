import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { getReportBundle } from "@/lib/reports.functions";
import type { ReportBundle } from "@/lib/reports.types";

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

export function resolveRange(s: ReportSearch): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (s.range) {
    case "today":
      break;
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    case "ytd":
      start.setMonth(0, 1);
      break;
    case "custom":
      return {
        from: s.from ? new Date(`${s.from}T00:00:00`).toISOString() : new Date(start).toISOString(),
        to: s.to ? new Date(`${s.to}T23:59:59.999`).toISOString() : end.toISOString(),
      };
    case "30d":
    default:
      start.setDate(start.getDate() - 29);
      break;
  }
  return { from: start.toISOString(), to: end.toISOString() };
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
  const range = useMemo(() => resolveRange(search), [search]);
  const fetchBundle = useServerFn(getReportBundle);

  return useQuery<ReportBundle>({
    queryKey: ["report-bundle", search.store ?? "all", search.chain ?? "all", range.from, range.to, search.compare],
    queryFn: () =>
      fetchBundle({
        data: {
          storeId: search.store ?? null,
          chain: search.chain ?? null,
          from: range.from,
          to: range.to,
          compare: search.compare,
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
