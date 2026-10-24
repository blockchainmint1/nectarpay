import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Users, Search, MailCheck } from "lucide-react";
import { getCustomers } from "@/lib/customers.functions";
import { customersCsv } from "@/lib/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const customersQuery = queryOptions({ queryKey: ["merchant-customers"], queryFn: () => getCustomers() });
export const Route = createFileRoute("/_authenticated/customers")({
  loader: ({ context }) => context.queryClient.ensureQueryData(customersQuery),
  head: () => ({ meta: [
    { title: "Customers · Nectar-Pay" },
    { name: "description", content: "Customer purchase history and store-specific marketing preferences for your Nectar-Pay stores." },
    { property: "og:title", content: "Customers · Nectar-Pay" },
    { property: "og:description", content: "Customer purchase history and marketing preferences for your stores." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CustomersPage,
});
function CustomersPage() {
  const { data } = useSuspenseQuery(customersQuery);
  const [store, setStore] = useState("all");
  const [search, setSearch] = useState("");
  const [consent, setConsent] = useState("all");
  const [page, setPage] = useState(0);
  const names = Object.fromEntries(data.stores.map(s => [s.id, s.name]));
  const filtered = data.customers.filter(c => (store === "all" || c.storeId === store) && c.email.includes(search.trim().toLowerCase()) && (consent === "all" || (consent === "yes" ? c.optedIn : !c.optedIn)));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
  const visible = filtered.slice(currentPage * 50, currentPage * 50 + 50);
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString() : "—";
  function download() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", customersCsv(filtered, names)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "nectar-pay-customers.csv"; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="mx-auto max-w-[90rem] px-4 py-8 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="flex items-center gap-3 text-2xl font-semibold"><Users className="size-6 text-primary" />Customers</h1><Button variant="outline" onClick={download} disabled={!filtered.length}><Download className="mr-2 size-4" />Download CSV</Button></div>
    <div className="my-6 flex flex-wrap gap-8 border-y border-border py-5"><div><p className="text-xs text-muted-foreground">Customer records</p><p className="mt-1 text-2xl font-semibold">{filtered.length}</p></div><div><p className="text-xs text-muted-foreground">Purchases</p><p className="mt-1 text-2xl font-semibold">{filtered.reduce((sum, c) => sum + c.purchases, 0)}</p></div><div><p className="text-xs text-muted-foreground">Signed up for deals</p><p className="mt-1 text-2xl font-semibold text-success">{filtered.filter(c => c.optedIn).length}</p></div></div>
    <div className="mb-5 flex flex-wrap gap-3">
      <Select value={store} onValueChange={v => { setStore(v); setPage(0); }}><SelectTrigger aria-label="Store" className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stores</SelectItem>{data.stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
      <Select value={consent} onValueChange={v => { setConsent(v); setPage(0); }}><SelectTrigger aria-label="Marketing signup" className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All signup preferences</SelectItem><SelectItem value="yes">Signed up for deals</SelectItem><SelectItem value="no">Not signed up</SelectItem></SelectContent></Select>
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search customer email" className="pl-9" placeholder="Search email…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr>{["Customer", "Store", "Purchases", "Total spent", "First purchase", "Last purchase", "Payment methods", "Deals signup"].map(label => <th key={label} className="whitespace-nowrap px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{visible.map(c => <tr key={`${c.storeId}:${c.email}`} className="border-b border-border/60"><td className="max-w-72 break-all px-3 py-4 font-medium">{c.email}</td><td className="min-w-32 px-3 py-4">{names[c.storeId]}</td><td className="px-3 py-4 tabular-nums">{c.purchases}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{Object.entries(c.totals).map(([currency, amount]) => <div key={currency}>{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</div>)}</td><td className="whitespace-nowrap px-3 py-4">{formatDate(c.firstPurchase)}</td><td className="whitespace-nowrap px-3 py-4">{formatDate(c.lastPurchase)}</td><td className="min-w-32 px-3 py-4 text-xs">{c.methods.join(", ") || "—"}</td><td className="whitespace-nowrap px-3 py-4">{c.optedIn ? <><span className="flex items-center gap-1 text-success"><MailCheck className="size-4" />Signed up</span><span className="text-xs text-muted-foreground">{formatDate(c.consentedAt ?? "")}</span></> : <span className="text-muted-foreground">Not signed up</span>}</td></tr>)}</tbody></table></div>
    {!filtered.length && <p className="py-12 text-center text-muted-foreground">{data.customers.length ? "No customers match these filters." : "No customer emails recorded yet."}</p>}
    {filtered.length > 50 && <div className="mt-5 flex items-center justify-end gap-3"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm text-muted-foreground">{currentPage + 1} / {Math.ceil(filtered.length / 50)}</span><Button variant="outline" size="sm" disabled={(currentPage + 1) * 50 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Next</Button></div>}
  </div>;
}