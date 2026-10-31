import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, HeartHandshake, Loader2, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { qrToDataURL } from "@/lib/qr";
import { stickerPath } from "@/lib/fast-enroll";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SortHeader } from "@/components/admin/sort-header";
import { sortRows, toggleSort, type SortState } from "@/lib/table-sort";
import { listFastEnrollments, activateFastEnrollment } from "@/lib/fast-enroll.functions";

type Enrollment = NonNullable<Awaited<ReturnType<typeof listFastEnrollments>>>[number];
type Key = "business_name" | "city" | "coin_id" | "status" | "egiving_opt_in" | "created_at";

const ACCESSORS: Record<Key, (r: Enrollment) => string | number | Date | null> = {
  business_name: (r) => r.business_name,
  city: (r) => r.city,
  coin_id: (r) => r.coin_id,
  status: (r) => r.status,
  egiving_opt_in: (r) => (r.egiving_opt_in ? 1 : 0),
  created_at: (r) => new Date(r.created_at),
};

export const Route = createFileRoute("/_authenticated/admin/fast")({
  component: AdminFast,
  head: () => ({
    meta: [
      { title: "Fast enrollments · NectarPay Admin" },
      { name: "description", content: "Merchants submitted through the public /fast enrollment page." },
      { property: "og:title", content: "Fast enrollments · NectarPay Admin" },
      { property: "og:description", content: "Review merchants who signed up with their Cold Storage Coin ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminFast() {
  const fn = useServerFn(listFastEnrollments);
  const activate = useServerFn(activateFastEnrollment);
  const [busy, setBusy] = useState<string | null>(null);
  const [sticker, setSticker] = useState<{ code: string; name: string; qr: string } | null>(null);
  const q = useQuery({ queryKey: ["admin", "fast-enrollments"], queryFn: () => fn() });
  const [sort, setSort] = useState<SortState<Key>>({ key: "created_at", dir: "desc" });
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => sortRows(q.data ?? [], sort, ACCESSORS), [q.data, sort]);
  const onSort = (key: Key) => setSort((s) => toggleSort(s, key));

  async function approve(r: Enrollment) {
    if (!window.confirm(`Activate ${r.business_name}? This starter store will be managed by your admin account, with payment emails sent to ${r.email}.`)) return;
    setBusy(r.id);
    try { await activate({ data: { id: r.id } }); toast.success("Merchant activated"); await q.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Activation failed."); }
    finally { setBusy(null); }
  }
  async function showSticker(r: Enrollment) {
    try { const qr = await qrToDataURL(`https://app.nectar-pay.com${stickerPath(r.coin_id)}`, { width: 640, margin: 3, errorCorrectionLevel: "M" }); setSticker({ code: r.coin_id, name: r.business_name, qr }); }
    catch { toast.error("Could not create sticker."); }
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading enrollments…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fast enrollments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submitted from the public enrollment page with a Cold Storage Coin ID. The coin ID is the sticker code,
          and the wallet it resolves to is where TSD lands.
        </p>
      </div>

      {q.error && <p className="text-destructive">{q.error instanceof Error ? q.error.message : "Could not load enrollments."}</p>}
      {sticker && <div role="dialog" aria-label="Merchant sticker" className="border border-border p-6">
        <div id="merchant-sticker" className="mx-auto max-w-sm text-center">
          <h2 className="text-2xl font-semibold">Pay with TSD</h2>
          <p className="mt-2">{sticker.name}</p>
          <img className="mx-auto my-4 w-64 max-w-full" src={sticker.qr} alt={`Payment sticker for ${sticker.code}`} />
          <p className="font-mono text-3xl font-bold">{sticker.code}</p>
          <p className="mt-2 text-sm">NectarPay · honest.money ecosystem</p>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <Button onClick={() => {
            const popup = window.open("", "_blank");
            const content = document.getElementById("merchant-sticker");
            if (!popup || !content) return;
            popup.document.write(`<html><head><title>NectarPay sticker</title><style>body{font-family:Arial;text-align:center}img{width:240px}p{margin:12px}</style></head><body>${content.innerHTML}</body></html>`);
            popup.document.close(); popup.addEventListener("load", () => popup.print());
          }}><Printer className="mr-2 h-4 w-4" />Print sticker</Button>
          <Button variant="outline" onClick={() => setSticker(null)}>Close</Button>
        </div>
      </div>}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="w-8 px-2 py-2" />
                <SortHeader label="Business" sortKey="business_name" state={sort} onSort={onSort} />
                <SortHeader label="City" sortKey="city" state={sort} onSort={onSort} />
                <SortHeader label="Coin / sticker" sortKey="coin_id" state={sort} onSort={onSort} />
                <SortHeader label="Give" sortKey="egiving_opt_in" state={sort} onSort={onSort} />
                <SortHeader label="Status" sortKey="status" state={sort} onSort={onSort} />
                <SortHeader label="Submitted" sortKey="created_at" state={sort} onSort={onSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No enrollments yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(isOpen ? null : r.id)}>
                      <td className="px-2 py-2 text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-3 py-2 font-medium">{r.business_name}</td>
                      <td className="px-3 py-2">{r.city ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{r.coin_id}</td>
                      <td className="px-3 py-2">
                        {r.egiving_opt_in ? <HeartHandshake className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={r.status === "pending" ? "secondary" : "outline"}>{r.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${r.id}-detail`} className="bg-muted/30">
                        <td />
                        <td colSpan={6} className="px-3 py-3">
                          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                            <Detail label="Contact" value={r.contact_name} />
                            <Detail label="Email" value={r.email} />
                            <Detail label="Phone" value={r.phone} />
                            <Detail label="Website" value={r.website} link />
                            <Detail label="Type of business" value={r.category} />
                            <Detail
                              label="Address"
                              value={[r.street, r.city, r.region, r.postal_code, r.country].filter(Boolean).join(", ")}
                            />
                            <Detail label="Wallet (TSD)" value={r.tsd_address} mono />
                            <Detail label="Submitted from" value={r.ip} mono />
                            <Detail label="Welcome email" value={r.welcome_sent_at ? `Sent ${new Date(r.welcome_sent_at).toLocaleString()}` : r.welcome_error ? `Failed: ${r.welcome_error}` : r.status === "activated" ? "Not sent" : null} />
                          </dl>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {r.status === "pending" && <Button disabled={busy === r.id} onClick={() => approve(r)}><CheckCircle2 className="mr-2 h-4 w-4" />{busy === r.id ? "Activating…" : "Activate starter store"}</Button>}
                            <Button variant="outline" onClick={() => showSticker(r)}><Printer className="mr-2 h-4 w-4" />Sticker</Button>
                            {r.status === "activated" && <a className="text-primary underline" href={stickerPath(r.coin_id)} target="_blank" rel="noreferrer">Open payment page</a>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value, mono, link }: { label: string; value: string | null; mono?: boolean; link?: boolean }) {
  return (
    <div>
      <dt className="uppercase tracking-[0.15em] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 break-all text-foreground ${mono ? "font-mono" : ""}`}>
        {link && value ? (
          <a className="text-primary underline" href={value} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}
