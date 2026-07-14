import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listLeads, updateLead } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: AdminLeads,
});

const STATUSES = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  new: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  contacted: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  qualified: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  won: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  lost: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  spam: "bg-red-500/20 text-red-300 border-red-500/40",
};

function AdminLeads() {
  const list = useServerFn(listLeads);
  const upd = useServerFn(updateLead);
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "followup">("newest");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: () => list(),
  });

  const mutate = useMutation({
    mutationFn: (vars: {
      id: string;
      status?: Status;
      admin_notes?: string;
      follow_up_at?: string | null;
      mark_contacted?: boolean;
    }) => upd({ data: vars as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-leads"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const all = data ?? [];
  const markets = useMemo(
    () => Array.from(new Set(all.map((l: any) => l.market).filter(Boolean))).sort(),
    [all],
  );
  const interests = useMemo(
    () => Array.from(new Set(all.map((l: any) => l.interest).filter(Boolean))).sort(),
    [all],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = all.filter((l: any) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (marketFilter !== "all" && l.market !== marketFilter) return false;
      if (interestFilter !== "all" && l.interest !== interestFilter) return false;
      if (!q) return true;
      const hay = [
        l.name, l.email, l.phone, l.telegram, l.business, l.market,
        l.interest, l.message, l.admin_notes, l.source,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    if (sortBy === "oldest") {
      rows = rows.slice().sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
    } else if (sortBy === "followup") {
      rows = rows.slice().sort((a: any, b: any) => {
        const av = a.follow_up_at ? +new Date(a.follow_up_at) : Infinity;
        const bv = b.follow_up_at ? +new Date(b.follow_up_at) : Infinity;
        return av - bv;
      });
    }
    return rows;
  }, [all, statusFilter, marketFilter, interestFilter, search, sortBy]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: all.length };
    for (const l of all) c[l.status] = (c[l.status] ?? 0) + 1;
    const now = Date.now();
    c.due = all.filter((l: any) => l.follow_up_at && +new Date(l.follow_up_at) <= now && l.status !== "won" && l.status !== "lost").length;
    return c;
  }, [all]);

  function exportCsv() {
    const cols = [
      "created_at", "status", "name", "email", "phone", "telegram",
      "business", "market", "interest", "preferred_time", "source",
      "follow_up_at", "last_contacted_at", "message", "admin_notes",
    ];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(",")];
    for (const l of filtered) lines.push(cols.map((c) => esc((l as any)[c])).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Leads / CRM</h1>
          <p className="text-xs text-muted-foreground">
            {counts.total ?? 0} total · {counts.new ?? 0} new · {counts.contacted ?? 0} contacted
            · {counts.qualified ?? 0} qualified · {counts.won ?? 0} won
            {counts.due > 0 && <> · <span className="text-amber-400">{counts.due} follow-up due</span></>}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <Input
          placeholder="Search name, email, phone, business, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={marketFilter} onValueChange={setMarketFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Market" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            {markets.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={interestFilter} onValueChange={setInterestFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Interest" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All interests</SelectItem>
            {interests.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="followup">Follow-up due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            No leads match.
          </div>
        )}
        {filtered.map((l: any) => (
          <LeadCard
            key={l.id}
            lead={l}
            onStatus={(status) => mutate.mutate({ id: l.id, status: status as Status })}
            onNotes={(admin_notes) => mutate.mutate({ id: l.id, admin_notes })}
            onFollowUp={(follow_up_at) => mutate.mutate({ id: l.id, follow_up_at })}
            onMarkContacted={() => mutate.mutate({ id: l.id, mark_contacted: true, status: "contacted" })}
          />
        ))}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  onStatus,
  onNotes,
  onFollowUp,
  onMarkContacted,
}: {
  lead: any;
  onStatus: (s: string) => void;
  onNotes: (n: string) => void;
  onFollowUp: (v: string | null) => void;
  onMarkContacted: () => void;
}) {
  const [notes, setNotes] = useState<string>(lead.admin_notes ?? "");
  const [expanded, setExpanded] = useState(false);
  const [followUp, setFollowUp] = useState<string>(
    lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 16) : "",
  );

  const statusColor = STATUS_COLORS[lead.status as Status] ?? "bg-muted text-muted-foreground";
  const dueDate = lead.follow_up_at ? new Date(lead.follow_up_at) : null;
  const overdue = dueDate ? dueDate.getTime() <= Date.now() && lead.status !== "won" && lead.status !== "lost" : false;

  return (
    <div className={`rounded-lg border p-4 ${overdue ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-card/40"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{lead.name}</p>
            <span className={`rounded border px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider ${statusColor}`}>
              {lead.status}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              {lead.market}
            </span>
            <span className="text-xs text-muted-foreground">· {lead.interest}</span>
            {lead.source && (
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">· {lead.source}</span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <a href={`mailto:${lead.email}`} className="hover:text-foreground">✉ {lead.email}</a>
            {lead.phone && <a href={`tel:${lead.phone}`} className="hover:text-foreground">☎ {lead.phone}</a>}
            {lead.telegram && <span>✈ {lead.telegram}</span>}
            {lead.business && <span>🏢 {lead.business}</span>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Received {new Date(lead.created_at).toLocaleString()}
            {lead.last_contacted_at && (
              <> · Last contacted {new Date(lead.last_contacted_at).toLocaleDateString()}</>
            )}
            {dueDate && (
              <> · <span className={overdue ? "text-amber-400 font-semibold" : ""}>Follow-up {dueDate.toLocaleString()}</span></>
            )}
            {lead.preferred_time && <> · Prefers: {lead.preferred_time}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onMarkContacted}>Mark contacted</Button>
          <Select value={lead.status} onValueChange={onStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {lead.message && (
        <p className="mt-3 whitespace-pre-wrap rounded bg-muted/40 p-3 text-sm">{lead.message}</p>
      )}

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Follow-up:</label>
            <Input
              type="datetime-local"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="w-56"
            />
            <Button size="sm" variant="outline" onClick={() => onFollowUp(followUp ? new Date(followUp).toISOString() : null)}>
              Save date
            </Button>
            {lead.follow_up_at && (
              <Button size="sm" variant="ghost" onClick={() => { setFollowUp(""); onFollowUp(null); }}>Clear</Button>
            )}
          </div>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes (visible to admins only)"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onNotes(notes); setExpanded(false); }}>Save notes</Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Close</Button>
          </div>
        </div>
      ) : (
        <button
          className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(true)}
        >
          {lead.admin_notes || lead.follow_up_at ? "Edit notes / follow-up" : "Add notes / follow-up"}
        </button>
      )}

      {!expanded && lead.admin_notes && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
          <span className="uppercase tracking-wider">Notes:</span> {lead.admin_notes}
        </p>
      )}
    </div>
  );
}
