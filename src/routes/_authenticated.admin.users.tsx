import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAdminUsers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const fn = useServerFn(listAdminUsers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fn(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Users</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Display</th>
              <th className="px-4 py-2 font-mono">Wallet</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">Last login</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.user_id} className="border-t border-border/40">
                <td className="px-4 py-2">{u.display_name}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {u.wallet_address ?? "—"}
                </td>
                <td className="px-4 py-2">
                  {u.roles.length ? u.roles.join(", ") : "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No users yet. Sign in with a TXC wallet to seed one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
