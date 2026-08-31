// /account — merchant self-service account controls, including the
// "close" path that mirrors what an admin can do: wipe personal info,
// take everything offline, keep all sales history in the records.

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Store } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { closeMyStore, closeMyAccount } from "@/lib/account-self.functions";
import { AccountSecurity } from "@/components/account-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account · Nectar.Pay" },
      { name: "description", content: "Manage your Nectar.Pay account, close a store, or close your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const closeStoreFn = useServerFn(closeMyStore);
  const closeAccountFn = useServerFn(closeMyAccount);

  const [storeTarget, setStoreTarget] = useState<{ id: string; name: string } | null>(null);
  const [storeConfirm, setStoreConfirm] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountConfirm, setAccountConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: stores } = useQuery({
    queryKey: ["account", "stores", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, deactivated_at")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  async function doCloseStore() {
    if (!storeTarget) return;
    setBusy(true);
    try {
      await closeStoreFn({ data: { store_id: storeTarget.id, reason: reason || null } });
      toast.success(`${storeTarget.name} is closed.`);
      setStoreTarget(null);
      setStoreConfirm("");
      setReason("");
      await qc.invalidateQueries({ queryKey: ["account", "stores"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not close the store.");
    } finally {
      setBusy(false);
    }
  }

  async function doCloseAccount() {
    setBusy(true);
    try {
      await closeAccountFn({ data: { reason: reason || null } });
      toast.success("Your account has been closed.");
      await signOut();
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not close the account.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as {user?.email ?? "your account"}.
      </p>

      <AccountSecurity />

      <section className="mt-8 rounded-lg border border-border bg-card/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Your stores
        </h2>
        <ul className="mt-3 divide-y divide-border">
          {(stores ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.name}</div>
                  {s.deactivated_at ? (
                    <div className="text-xs text-muted-foreground">Closed</div>
                  ) : (
                    <Link
                      to="/stores/$storeId"
                      params={{ storeId: s.id }}
                      className="text-xs text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </div>
              {!s.deactivated_at && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStoreTarget({ id: s.id, name: s.name });
                    setStoreConfirm("");
                    setReason("");
                  }}
                >
                  Close store
                </Button>
              )}
            </li>
          ))}
          {(stores?.length ?? 0) === 0 && (
            <li className="py-3 text-sm text-muted-foreground">No stores yet.</li>
          )}
        </ul>
      </section>

      <section className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-widest">Danger zone</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Closing your account signs you out for good, removes your name, email and avatar,
          stops every email and alert we send you, and takes your stores, terminals, API keys
          and share links offline. Your invoices and transactions stay in the records for
          accounting and tax purposes — we just can't contact you about them anymore.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => {
            setAccountOpen(true);
            setAccountConfirm("");
            setReason("");
          }}
        >
          Close my account
        </Button>
      </section>

      {/* Close store */}
      <AlertDialog open={!!storeTarget} onOpenChange={(o) => !o && setStoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close “{storeTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Terminals, API keys, share links and payment rails for this store are switched
              off immediately. Past invoices and transactions are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="store-confirm">
                Type the store name to confirm
              </Label>
              <Input
                id="store-confirm"
                value={storeConfirm}
                onChange={(e) => setStoreConfirm(e.target.value)}
                placeholder={storeTarget?.name ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="store-reason">Reason (optional)</Label>
              <Textarea
                id="store-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep store</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || storeConfirm.trim() !== (storeTarget?.name ?? "")}
              onClick={(e) => {
                e.preventDefault();
                void doCloseStore();
              }}
            >
              {busy ? "Closing…" : "Close store"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close account */}
      <AlertDialog open={accountOpen} onOpenChange={setAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone from here — you'd need to contact support to reopen it.
              Your sales history is retained; your personal information is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="account-confirm">Type CLOSE to confirm</Label>
              <Input
                id="account-confirm"
                value={accountConfirm}
                onChange={(e) => setAccountConfirm(e.target.value)}
                placeholder="CLOSE"
              />
            </div>
            <div>
              <Label htmlFor="account-reason">Reason (optional)</Label>
              <Textarea
                id="account-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep my account</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || accountConfirm.trim().toUpperCase() !== "CLOSE"}
              onClick={(e) => {
                e.preventDefault();
                void doCloseAccount();
              }}
            >
              {busy ? "Closing…" : "Close account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
