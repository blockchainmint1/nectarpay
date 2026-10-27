// /invite/<token> — accept an invitation to help run someone's store.

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  previewStoreInvite,
  acceptStoreInvite,
  ROLE_LABEL,
  ROLE_BLURB,
} from "@/lib/store-team.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept your invitation · Nectar.Pay" },
      { name: "description", content: "Accept an invitation to help run a Nectar.Pay store." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const previewFn = useServerFn(previewStoreInvite);
  const acceptFn = useServerFn(acceptStoreInvite);
  const [busy, setBusy] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => previewFn({ data: { token } }),
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("nectar.pending-invite", token);
    } catch {
      /* ignore */
    }
  }, [token]);

  async function accept() {
    setBusy(true);
    try {
      const res = await acceptFn({ data: { token } });
      try {
        sessionStorage.removeItem("nectar.pending-invite");
      } catch {
        /* ignore */
      }
      toast.success("You're in.");
      navigate({ to: "/stores/$storeId", params: { storeId: res.store_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept the invitation.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-lg border border-border bg-card/50 p-8">
        {isLoading || loading ? (
          <p className="text-sm text-muted-foreground">Checking your invitation…</p>
        ) : !invite?.valid ? (
          <>
            <h1 className="text-xl font-semibold">This invitation can't be used</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invite?.reason === "used"
                ? "It has already been accepted."
                : invite?.reason === "expired"
                  ? "It has expired. Ask the store owner to send a new one."
                  : "The link looks wrong or was cancelled."}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">
              You've been invited to {invite.store_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access level: <span className="text-foreground">{ROLE_LABEL[invite.role]}</span> —{" "}
              {ROLE_BLURB[invite.role]}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The invitation was sent to {invite.email}. Sign in with that address to accept.
            </p>

            {user ? (
              <Button className="mt-6 w-full" onClick={accept} disabled={busy}>
                Accept invitation
              </Button>
            ) : (
              <Button
                className="mt-6 w-full"
                onClick={() => navigate({ to: "/auth", search: { redirect: `/invite/${token}` } })}
              >
                Sign in to accept
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
