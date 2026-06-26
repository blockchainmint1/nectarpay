import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin as PinIcon, Globe, ExternalLink } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMerchantMapPins, type MapPin } from "@/lib/merchant-map.functions";

export const Route = createFileRoute("/where")({
  head: () => ({
    meta: [
      { title: "Where to spend crypto · Nectar.Pay" },
      {
        name: "description",
        content:
          "Live map of merchants accepting crypto via Nectar.Pay — Bitcoin, TEXITcoin, USDC, USDT, PYUSD and more, with zero per-transaction fees.",
      },
      { property: "og:title", content: "Where to spend crypto · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "Find a merchant near you accepting BTC, TEXITcoin, and stablecoins through Nectar.Pay.",
      },
    ],
    links: [
      // Leaflet CSS — load from CDN so we don't add a CSS @import.
      {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity:
          "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossOrigin: "",
      },
    ],
  }),
  component: WherePage,
});

function WherePage() {
  const fetchPins = useServerFn(getMerchantMapPins);
  const { data, isLoading } = useQuery({
    queryKey: ["merchant-map-pins"],
    queryFn: () => fetchPins(),
    staleTime: 60_000,
  });
  const pins = data?.pins ?? [];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Globe className="h-3.5 w-3.5" />
            Live merchant map
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Where to spend crypto
          </h1>
          <p className="mt-3 max-w-2xl text-foreground/70">
            Every pin below is a real merchant accepting Bitcoin, TEXITcoin and
            stablecoins through Nectar.Pay. 1,200 terminals are shipping now —
            check back as more pins light up.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="flex h-[60vh] items-center justify-center rounded-xl border border-border bg-card/40 text-sm text-muted-foreground">
            Loading map…
          </div>
        ) : (
          <ClientMap pins={pins} />
        )}

        <div className="mt-6 text-xs text-muted-foreground">
          {pins.length === 0
            ? "No merchants visible yet. Be the first."
            : `${pins.length} merchant${pins.length === 1 ? "" : "s"} on the map.`}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Run a business? Get on the map.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Take crypto in person or online, settle straight to your wallet.
              Zero per-transaction fees.
            </p>
          </div>
          <Button asChild size="lg">
            <a href="/signup">Start free</a>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/**
 * Renders Leaflet only in the browser — Leaflet touches `window` at import.
 */
function ClientMap({ pins }: { pins: MapPin[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="h-[60vh] rounded-xl border border-border bg-card/40" />
    );
  }
  // Dynamic require avoids SSR on Leaflet.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const RL = require("react-leaflet") as typeof import("react-leaflet");
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const L = require("leaflet") as typeof import("leaflet");

  // Default Leaflet markers use bundled image URLs that 404 under Vite.
  // Replace with inline SVG DivIcon so we don't ship marker images.
  const fullIcon = L.divIcon({
    className: "",
    html: `<div style="background:oklch(0.68 0.19 62);border:2px solid white;border-radius:9999px;width:18px;height:18px;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  const cityIcon = L.divIcon({
    className: "",
    html: `<div style="background:oklch(0.85 0.10 80);border:2px solid white;border-radius:9999px;width:12px;height:12px;opacity:0.85"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  // Pick a starting view: centroid of visible pins, or fallback US.
  const center: [number, number] =
    pins.length > 0
      ? [
          pins.reduce((s, p) => s + p.lat, 0) / pins.length,
          pins.reduce((s, p) => s + p.lng, 0) / pins.length,
        ]
      : [31.5, -99]; // Texas-ish

  const zoom = pins.length > 0 ? 3 : 4;

  return (
    <div className="h-[60vh] overflow-hidden rounded-xl border border-border">
      <RL.MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <RL.TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((pin) => (
          <RL.Marker
            key={pin.store_id}
            position={[pin.lat, pin.lng]}
            icon={pin.listing_visibility === "full" ? fullIcon : cityIcon}
          >
            <RL.Popup>
              <PinPopup pin={pin} />
            </RL.Popup>
          </RL.Marker>
        ))}
      </RL.MapContainer>
    </div>
  );
}

function PinPopup({ pin }: { pin: MapPin }) {
  if (pin.listing_visibility === "city_only") {
    return (
      <div className="min-w-[180px] text-sm">
        <div className="flex items-center gap-1 font-medium">
          <PinIcon className="h-3.5 w-3.5" />
          Crypto merchant
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {[pin.city, pin.country].filter(Boolean).join(", ") || "Unknown location"}
        </div>
        {pin.category && (
          <Badge variant="secondary" className="mt-2">
            {pin.category}
          </Badge>
        )}
      </div>
    );
  }
  return (
    <div className="min-w-[220px] text-sm">
      <div className="font-semibold">{pin.name}</div>
      {pin.category && (
        <Badge variant="secondary" className="mt-1">
          {pin.category}
        </Badge>
      )}
      {pin.address && (
        <div className="mt-2 text-xs text-muted-foreground">{pin.address}</div>
      )}
      {pin.description && (
        <p className="mt-2 text-xs">{pin.description}</p>
      )}
      {pin.website && (
        <a
          href={pin.website}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Visit site <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
