import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listLeads, updateLead } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
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

function AdminLeads() {
  const list = useServerFn(listLeads);
  const upd = useServerFn(updateLead);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: () => list(),
  });

  const mutate = useMutation({
    mutationFn: (vars: { id: string; status?: string; admin_notes?: string }) =>
      upd({ data: vars as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  const leads = (data ?? []).filter((l) => filter === "all" || l.status === filter);
  const counts = (data ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Leads</h1>
          <p className="text-xs text-muted-foreground">
            {data?.length ?? 0} total · {counts.new ?? 0} new · {counts.contacted ?? 0} contacted
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {leads.length === 0 && (
          <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            No leads yet.
          </div>
        )}
        {leads.map((l) => (
          <LeadCard
            key={l.id}
            lead={l}
            onStatus={(status) => mutate.mutate({ id: l.id, status })}
            onNotes={(admin_notes) => mutate.mutate({ id: l.id, admin_notes })}
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
}: {
  lead: any;
  onStatus: (s: string) => void;
  onNotes: (n: string) => void;
}) {
  const [notes, setNotes] = useState<string>(lead.admin_notes ?? "");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{lead.name}</p>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              {lead.market}
            </span>
            <span className="text-xs text-muted-foreground">· {lead.interest}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <a href={`mailto:${lead.email}`} className="hover:text-foreground">{lead.email}</a>
            {lead.telegram && <> · {lead.telegram}</>}
            {" · "}
            {new Date(lead.created_at).toLocaleString()}
          </p>
        </div>
        <Select value={lead.status} onValueChange={onStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lead.message && (
        <p className="mt-3 whitespace-pre-wrap rounded bg-muted/40 p-3 text-sm">
          {lead.message}
        </p>
      )}

      {expanded ? (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes (visible to admins only)"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onNotes(notes); setExpanded(false); }}>
              Save notes
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(true)}
        >
          {lead.admin_notes ? "Edit notes" : "Add notes"}
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
