// "/" is now the merchant app entry: send everyone to the wallet/email
// sign-in screen. Marketing lives on the separate web project.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · Nectar.Pay merchant app" },
      {
        name: "description",
        content:
          "Sign in to the Nectar.Pay merchant app to take payments, manage stores and terminals, and track payouts.",
      },
      { property: "og:title", content: "Sign in · Nectar.Pay merchant app" },
      {
        property: "og:description",
        content:
          "Sign in to the Nectar.Pay merchant app to take payments, manage stores and terminals, and track payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
