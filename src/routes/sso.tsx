import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { finishHmeSso } from "@/lib/hme-auth";

// Return address for Honest Money SSO. In popup mode we hand the ticket back
// to the opener (the /auth page) and close; otherwise we finish sign-in here.
export const Route = createFileRoute("/sso")({
  validateSearch: z.object({ token: z.string().optional(), popup: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Signing in with Honest Money · Nectar.Pay" },
      { name: "description", content: "Finishing your Honest Money sign-in to Nectar.Pay." },
      { property: "og:title", content: "Signing in with Honest Money · Nectar.Pay" },
      { property: "og:description", content: "Finishing your Honest Money sign-in to Nectar.Pay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SsoPage,
});

function SsoPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    if (!token) {
      setMsg("No sign-in ticket found.");
      return;
    }
    window.history.replaceState(null, "", "/sso");
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({ type: "hme-sso", token }, window.location.origin);
        window.close();
        return;
      } catch { /* fall through */ }
    }
    finishHmeSso(token)
      .then(({ is_admin }) => navigate({ to: is_admin ? "/admin" : "/dashboard" }))
      .catch((e) => setMsg(e instanceof Error ? e.message : "Sign-in failed"));
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
