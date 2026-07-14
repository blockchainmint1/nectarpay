import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider, themeBootstrapScript } from "../lib/theme";
import { Toaster } from "../components/ui/sonner";
import { PosReturnBar } from "../components/pos-return-bar";
import { isNative } from "../lib/pos-native";
import { captureAffiliateFromUrl, installOutboundAffiliateDecorator } from "../lib/affiliate";

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
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Nectar.Pay" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "NDf4f7KhIuawD5rOq3HXdn7plw1sox07A5sUbeFQu6M" },
    ],

    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://api.fontshare.com" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=general-sans@400,500,600,700&display=swap" },
      { rel: "icon", type: "image/png", href: "/__l5e/assets-v1/9a1a15be-5b2c-4cc1-ad77-3fd244828324/nectar-hive-mark.png" },
      { rel: "apple-touch-icon", href: "/__l5e/assets-v1/9a1a15be-5b2c-4cc1-ad77-3fd244828324/nectar-hive-mark.png" },
    ],
  }),


  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
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

  const location = useLocation();

  // Detect merchant native shell via ?mode=merchant on first load and
  // persist so subsequent client-side navigations keep the flag. See
  // src/lib/app-mode.ts — this drives which UI variants are shown.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("mode");
      if (q === "merchant" || q === "terminal") {
        window.__NECTAR_APP_MODE__ = q;
        localStorage.setItem("nectar.app-mode", q);
      } else {
        const saved = localStorage.getItem("nectar.app-mode");
        if (saved === "merchant" || saved === "terminal") {
          window.__NECTAR_APP_MODE__ = saved;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // First-touch affiliate capture: reads ?r=<affiliateId> on every navigation
  // and stashes it in a 90-day cookie + localStorage. No-op if already set.
  useEffect(() => {
    captureAffiliateFromUrl();
  }, [location.pathname, location.search]);

  // Decorate outbound links to blockchainmint.com / coldstoragecoins.com
  // with the captured affiliate ref so attribution survives the hop.
  useEffect(() => installOutboundAffiliateDecorator(), []);

  useEffect(() => {
    const inPosShell =
      location.pathname.startsWith("/pos") ||
      location.pathname === "/m" ||
      location.pathname.startsWith("/m/") ||
      isNative();
    if (inPosShell) {
      const existing = document.getElementById("honest-help-widget");
      if (existing) existing.remove();
      return;
    }
    if (document.getElementById("honest-help-widget")) return;
    const s = document.createElement("script");
    s.id = "honest-help-widget";
    s.src = "https://help.honest.money/api/public/widget.js";
    s.async = true;
    s.dataset.brandName = "Nectar.Pay";
    s.dataset.context = "Nectar.Pay";
    s.dataset.ecosystem = "Nectar.Pay";
    s.dataset.folder = "nectarpay";
    s.dataset.theme = "auto";
    document.body.appendChild(s);
  }, [location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <PosReturnBar />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

