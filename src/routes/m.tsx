// /m — Merchant app entry. Native shell (iOS/Android) boots here so we
// know to set merchant mode, hide terminal-only UI, and drop into the
// merchant home once the user is signed in. On the web, this route is
// also fine to link to — it just redirects into the authenticated area.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/m")({
  head: () => ({
    meta: [
      { title: "NectarPay POS" },
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0D1B33" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    // /_authenticated/m is the real home; that layout redirects
    // unauthenticated users to /auth.
    throw redirect({ to: "/m/home" });
  },
});
