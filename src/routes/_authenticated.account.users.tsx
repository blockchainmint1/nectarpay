// /account/users — invite limited-access people (accountant, manager) to one
// store, several stores, or all of them, and see who can reach what.

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  listAllStoreTeams,
  inviteStoreUserMulti,
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
import { Checkbox } from "@/components/ui/checkbox";
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
          "Give your accountant or manager their own limited sign-in for one Nectar.Pay store or all of them.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

const ROLES: StoreRole[] = ["viewer", "manager", "admin"];

function UsersPage() {
  const qc = useQueryClient();
  const allFn = useServerFn(listAllStoreTeams);
  const inviteFn = useServerFn(inviteStoreUserMulti);
  const roleFn = useServerFn(updateStoreMemberRole);
  const removeFn = useServerFn(removeStoreMember);
  const revokeFn = useServerFn(revokeStoreInvite);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StoreRole>("viewer");
  const [scope, setScope] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team", "all"],
    queryFn: () => allFn(),
  });

  const stores = data?.stores ?? [];

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["team", "all"] });
  }

  function toggleStore(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function sendInvite() {
    const ids = scope === "all" ? stores.map((s) => s.id) : picked;
    if (!email.trim() || !ids.length) return;
    setBusy(true);
    try {
      await inviteFn({ data: { store_ids: ids, email: email.trim(), role } });
      toast.success(
        `Invitation sent to ${email.trim()} for ${ids.length} ${ids.length === 1 ? "store" : "stores"}.`,
      );
      setEmail("");
      setPicked([]);
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
        Give your bookkeeper, accountant or manager their own sign-in — for one store, a few, or
        all of them. Only you can add or remove people, change wallet setup, billing, or close a
        store.
      </p>

      {stores.length === 0 && !isLoading && (
        <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You need a store before you can add people to it.
        </div>
      )}

      {stores.length > 0 && (
        <>
          <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Invite someone
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_190px]">
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
            </div>

            <div className="mt-4">
              <Label>Which stores?</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "all" | "pick")}>
                <SelectTrigger className="mt-1 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stores ({stores.length})</SelectItem>
                  <SelectItem value="pick">Choose stores…</SelectItem>
                </SelectContent>
              </Select>
              {scope === "pick" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {stores.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={picked.includes(s.id)}
                        onCheckedChange={() => toggleStore(s.id)}
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={sendInvite}
                disabled={busy || !email.trim() || (scope === "pick" && picked.length === 0)}
              >
                <UserPlus className="mr-1 h-4 w-4" /> Send invite
              </Button>
              <p className="text-xs text-muted-foreground">{ROLE_BLURB[role]}</p>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              People with access
            </h2>
            {isLoading ? (
              <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(data?.people ?? []).map((p) => (
                  <li key={p.user_id} className="py-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name || p.email || "Member"}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {p.access.length === stores.length
                          ? "All stores"
                          : `${p.access.length} of ${stores.length} stores`}
                      </div>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {p.access.map((a) => (
                        <li
                          key={a.member_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2"
                        >
                          <span className="truncate text-sm">{a.store_name}</span>
                          <div className="flex items-center gap-2">
                            <Select
                              value={a.role}
                              onValueChange={async (v) => {
                                try {
                                  await roleFn({
                                    data: {
                                      store_id: a.store_id,
                                      member_id: a.member_id,
                                      role: v as StoreRole,
                                    },
                                  });
                                  toast.success("Access updated.");
                                  await refresh();
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : "Could not update.",
                                  );
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
                              aria-label={`Remove access to ${a.store_name}`}
                              onClick={async () => {
                                try {
                                  await removeFn({
                                    data: { store_id: a.store_id, member_id: a.member_id },
                                  });
                                  toast.success("Access removed.");
                                  await refresh();
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : "Could not remove.",
                                  );
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                {(data?.people.length ?? 0) === 0 && (
                  <li className="py-3 text-sm text-muted-foreground">
                    Nobody else has access to your stores yet.
                  </li>
                )}
              </ul>
            )}
          </section>

          {(data?.invites.length ?? 0) > 0 && (
            <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Pending invitations
              </h2>
              <ul className="mt-3 divide-y divide-border">
                {(data?.invites ?? []).map((i) => (
                  <li
                    key={i.group_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-sm">{i.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {i.store_names.length === stores.length
                            ? "All stores"
                            : i.store_names.join(", ")}{" "}
                          · {ROLE_LABEL[i.role]} ·{" "}
                          {i.expired ? "expired" : "waiting to be accepted"}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await revokeFn({ data: { group_id: i.group_id } });
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
