import type React from "react";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { money, pct } from "./report-context";

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const content = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: unknown[][];
}) {
  return (
    <Button variant="outline" size="sm" onClick={() => downloadCsv(filename, headers, rows)}>
      <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
    </Button>
  );
}

export function Tile({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {delta !== null && delta !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 ${
              delta >= 0 ? "text-emerald-500" : "text-destructive"
            }`}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

export function DeltaTile({
  label,
  value,
  current,
  previous,
  currency,
  sub,
}: {
  label: string;
  value: string;
  current: number;
  previous: number | null | undefined;
  currency?: string;
  sub?: string;
}) {
  const d = pct(current, previous);
  return (
    <Tile
      label={label}
      value={value}
      delta={d}
      sub={
        sub ??
        (previous !== null && previous !== undefined
          ? `vs ${currency ? money(previous, currency) : previous} prior`
          : undefined)
      }
    />
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/50">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Empty({ children = "No data in this date range yet." }: { children?: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Bar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${w}%` }} />
    </div>
  );
}
