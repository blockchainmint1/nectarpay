import { createFileRoute } from "@tanstack/react-router";

import { useReportData, money } from "@/components/reports/report-context";
import { Bar, CsvButton, Empty, Panel } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/locations")({
  head: () => ({
    meta: [
      { title: "Stores & devices · Nectar-PAY reports" },
      { name: "description", content: "Volume per store plus terminal and share-link activity." },
    ],
  }),
  component: LocationsReport,
});

function ago(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function LocationsReport() {
  const { data, isLoading, error } = useReportData();
  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { currency, byStore, terminals, shareLinks } = data;
  const maxStore = Math.max(0, ...byStore.map((s) => s.volume));

  return (
    <div className="space-y-6">
      <Panel
        title="By store"
        description="Paid volume in the selected range"
        action={
          <CsvButton
            filename="nectarpay-by-store.csv"
            headers={["store", "volume", "payments", "average"]}
            rows={byStore.map((s) => [s.name, s.volume, s.count, s.average])}
          />
        }
      >
        {byStore.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-4">
            {byStore.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {money(s.volume, currency)} · {s.count} · avg {money(s.average, currency)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={s.volume} max={maxStore} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Terminals"
        description="Quiet devices stand out here"
        action={
          <CsvButton
            filename="nectarpay-terminals.csv"
            headers={["terminal", "store", "last_seen", "city", "country", "status"]}
            rows={terminals.map((t) => [
              t.label,
              t.store,
              t.lastSeen ?? "",
              t.city ?? "",
              t.country ?? "",
              t.revoked ? "revoked" : "active",
            ])}
          />
        }
      >
        {terminals.length === 0 ? (
          <Empty>No terminals paired yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Terminal</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">Last seen</th>
                  <th className="py-2 pr-4">Where</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{t.label}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{t.store}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{ago(t.lastSeen)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {[t.city, t.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2.5">{t.revoked ? "Revoked" : "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Share links"
        description="Browser checkout links and their traffic"
        action={
          <CsvButton
            filename="nectarpay-share-links.csv"
            headers={["slug", "title", "store", "views", "status"]}
            rows={shareLinks.map((l) => [l.slug, l.title ?? "", l.store, l.views, l.active ? "active" : "off"])}
          />
        }
      >
        {shareLinks.length === 0 ? (
          <Empty>No share links created yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Link</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4 text-right">Views</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {shareLinks.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium">{l.title || l.slug}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">/t/{l.slug}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{l.store}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{l.views}</td>
                    <td className="py-2.5">{l.active ? "Active" : "Off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
