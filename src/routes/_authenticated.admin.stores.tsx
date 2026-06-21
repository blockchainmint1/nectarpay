import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAdminStores } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/stores")({
  component: AdminStores,
});

function AdminStores() {
  const fn = useServerFn(listAdminStores);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => fn(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Stores</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 font-mono">Owner</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s) => (
              <tr key={s.id} className="border-t border-border/40">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {s.owner_id?.slice(0, 8)}…
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No stores yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
