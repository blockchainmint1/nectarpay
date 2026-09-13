// /account/users — invite limited-access people (accountant, manager) to a
// store and set what each of them can do.

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  listOwnedStores,
  listStoreTeam,
  inviteStoreUser,
  updateStoreMemberRole,
  removeStoreMember,
  revokeStoreInvite,
  ROLE_LABEL,
  ROLE_BLURB,
  type StoreRole,
} from "@/lib/store-team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/account/users")({
  head: () => ({
    meta: [
      { title: "Authorized users · Nectar.Pay" },
      {
        name: "description",
        content:
          "Give your accountant or manager their own limited sign-in for a Nectar.Pay store.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

const ROLES: StoreRole[] = ["viewer", "manager", "admin"];

function UsersPage() {
  const qc = useQueryClient();
  const ownedFn = useServerFn(listOwnedStores);
  const teamFn = useServerFn(listStoreTeam);
  const inviteFn = useServerFn(inviteStoreUser);
  const roleFn = useServerFn(updateStoreMemberRole);
  const removeFn = useServerFn(removeStoreMember);
  const revokeFn = useServerFn(revokeStoreInvite);

  const [storeId, setStoreId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StoreRole>("viewer");
  const [busy, setBusy] = useState(false);

  const { data: stores } = useQuery({
    queryKey: ["team", "owned-stores"],
    queryFn: async () => {
      const rows = await ownedFn();
      if (rows.length && !storeId) setStoreId(rows[0].id);
      return rows;
    },
  });

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", storeId],
    queryFn: () => teamFn({ data: { store_id: storeId } }),
    enabled: !!storeId,
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["team", storeId] });
  }

  async function sendInvite() {
    if (!storeId || !email.trim()) return;
    setBusy(true);
    try {
      await inviteFn({ data: { store_id: storeId, email: email.trim(), role } });
      toast.success(`Invitation sent to ${email.trim()}.`);
      setEmail("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/account"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Authorized users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Give your bookkeeper, accountant or manager their own sign-in, for one store at a time.
        Only you can add or remove people, change wallet setup, billing, or close a store.
      </p>

      {(stores?.length ?? 0) > 1 && (
        <div className="mt-6 max-w-xs">
          <Label>Store</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick a store" />
            </SelectTrigger>
            <SelectContent>
              {(stores ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(stores?.length ?? 0) === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You need a store before you can add people to it.
        </div>
      )}

      {storeId && (
        <>
          <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Invite someone
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_190px_auto]">
              <div>
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  className="mt-1"
                  placeholder="accounting@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Access</Label>
                <Select value={role} onValueChange={(v) => setRole(v as StoreRole)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={sendInvite} disabled={busy || !email.trim()}>
                  <UserPlus className="mr-1 h-4 w-4" /> Send invite
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{ROLE_BLURB[role]}</p>
          </section>

          <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              People with access
            </h2>
            {isLoading ? (
              <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(team?.members ?? []).map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.name || m.email || "Member"}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={m.role}
                        onValueChange={async (v) => {
                          try {
                            await roleFn({
                              data: { store_id: storeId, member_id: m.id, role: v as StoreRole },
                            });
                            toast.success("Access updated.");
                            await refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Could not update.");
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove access"
                        onClick={async () => {
                          try {
                            await removeFn({ data: { store_id: storeId, member_id: m.id } });
                            toast.success("Access removed.");
                            await refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Could not remove.");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
                {(team?.members.length ?? 0) === 0 && (
                  <li className="py-3 text-sm text-muted-foreground">
                    Nobody else has access to this store yet.
                  </li>
                )}
              </ul>
            )}
          </section>

          {(team?.invites.length ?? 0) > 0 && (
            <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Pending invitations
              </h2>
              <ul className="mt-3 divide-y divide-border">
                {(team?.invites ?? []).map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-sm">{i.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {ROLE_LABEL[i.role]} · {i.expired ? "expired" : "waiting to be accepted"}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await revokeFn({ data: { store_id: storeId, invite_id: i.id } });
                          toast.success("Invitation cancelled.");
                          await refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not cancel.");
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8 rounded-lg border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">What each level can do</p>
            <ul className="mt-2 space-y-1">
              {ROLES.map((r) => (
                <li key={r}>
                  <span className="text-foreground">{ROLE_LABEL[r]}:</span> {ROLE_BLURB[r]}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
