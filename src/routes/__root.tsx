import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nectar.Pay — No keys. No fees." },
      {
        name: "description",
        content:
          "Nothing could be sweeter than keeping all of your money. Non-custodial crypto payment gateway for BTC, TEXITcoin and EVM stablecoins.",
      },
      { property: "og:title", content: "Nectar.Pay — No keys. No fees." },
      {
        property: "og:description",
        content:
          "Nothing could be sweeter than keeping all of your money. Non-custodial crypto payments, direct to your wallet.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Nectar.Pay" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nectar.Pay — No keys. No fees." },
      {
        name: "twitter:description",
        content:
          "Nothing could be sweeter than keeping all of your money. Non-custodial crypto payments, direct to your wallet.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs><linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%23f5c44a'/><stop offset='100%25' stop-color='%23c98a2a'/></linearGradient></defs><ellipse cx='11.5' cy='14' rx='7' ry='9' fill='%23fff3cf' fill-opacity='0.7' transform='rotate(-22 11.5 14)'/><ellipse cx='28.5' cy='14' rx='7' ry='9' fill='%23fff3cf' fill-opacity='0.7' transform='rotate(22 28.5 14)'/><ellipse cx='20' cy='22' rx='10' ry='12' fill='url(%23b)' stroke='%231f1408' stroke-width='1.4'/><path d='M12.4 18 Q20 16 27.6 18' stroke='%231f1408' stroke-width='2.6' stroke-linecap='round' fill='none'/><path d='M11.2 24 Q20 22.4 28.8 24' stroke='%231f1408' stroke-width='2.6' stroke-linecap='round' fill='none'/><path d='M13 30 Q20 29 27 30' stroke='%231f1408' stroke-width='2.6' stroke-linecap='round' fill='none'/><path d='M18.6 33.6 L20 37 L21.4 33.6 Z' fill='%231f1408'/></svg>" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
