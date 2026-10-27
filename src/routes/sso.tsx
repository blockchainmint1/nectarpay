import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { finishHmeSso } from "@/lib/hme-auth";
import { hmeSsoSearch, hmeChannelName, validHmeFlow } from "@/lib/hme-popup";

// Return address for Honest Money SSO. In popup mode we hand the ticket back
// to the opener (the /auth page) and close; otherwise we finish sign-in here.
export const Route = createFileRoute("/sso")({
  validateSearch: hmeSsoSearch,
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
  const { token, flow } = Route.useSearch();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Signing you in…");
  const finishing = useRef(false);
  const ticket = useRef<{ token: string; flow?: string } | undefined>(undefined);

  useEffect(() => {
    if (token) ticket.current = { token, flow };
    const callback = ticket.current;
    if (!callback) {
      setMsg("No sign-in ticket found.");
      return;
    }
    const { token: callbackToken, flow: callbackFlow } = callback;
    if (validHmeFlow(callbackFlow)) {
      const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel(hmeChannelName(callbackFlow));
      const message = { type: "hme-sso", flow: callbackFlow, token: callbackToken };
      const acknowledge = (data: unknown) => {
        if (!data || typeof data !== "object") return;
        const ack = data as Record<string, unknown>;
        if (ack.type === "hme-sso-ack" && ack.flow === callbackFlow) {
          setMsg("Returning to NectarPay…");
          window.close();
          window.history.replaceState(null, "", "/sso");
        }
      };
      const onMessage = (event: MessageEvent) => {
        if (event.origin === window.location.origin && event.source === window.opener) acknowledge(event.data);
      };
      if (channel) channel.onmessage = event => acknowledge(event.data);
      window.addEventListener("message", onMessage);
      const send = () => {
        channel?.postMessage(message);
        try { window.opener?.postMessage(message, window.location.origin); } catch { /* channel survives lost opener */ }
      };
      send();
      const retry = window.setInterval(send, 500);
      const timeout = window.setTimeout(() => {
        window.clearInterval(retry);
        channel?.close();
        setMsg("Could not reach your NectarPay window. Close this popup and try signing in again.");
      }, 15000);
      return () => {
        window.clearInterval(retry);
        window.clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        channel?.close();
      };
    }
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({ type: "hme-sso", token: callbackToken }, window.location.origin);
        window.close();
        return;
      } catch { /* fall through */ }
    }
    if (finishing.current) return;
    finishing.current = true;
    window.history.replaceState(null, "", "/sso");
    finishHmeSso(callbackToken)
      .then(({ is_admin }) => navigate({ to: is_admin ? "/admin" : "/dashboard" }))
      .catch((e) => setMsg(e instanceof Error ? e.message : "Sign-in failed"));
  }, [token, flow, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
