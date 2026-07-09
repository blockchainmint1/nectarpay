import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin as PinIcon, Globe, ExternalLink, BellRing, Loader2, CheckCircle2 } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getMerchantMapPins, type MapPin } from "@/lib/merchant-map.functions";
import { subscribeMerchantAlert } from "@/lib/merchant-alerts.functions";

export const Route = createFileRoute("/where")({
  head: () => ({
    meta: [
      { title: "Where · Nectar.Pay" },
      {
        name: "description",
        content:
          "Live maps of merchants accepting crypto via Nectar.Pay across DFW, LA, Denver, Nashville, Salt Lake and Singapore — Bitcoin, TEXITcoin, USDC, USDT, PYUSD and more.",
      },
      { property: "og:title", content: "Where · Nectar.Pay" },
      {
        property: "og:description",
        content:
          "Find a merchant near you accepting BTC, TEXITcoin, and stablecoins through Nectar.Pay.",
      },
          { property: "og:url", content: "https://nectar-pay.com/where" },
],
    links: [
      {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity:
          "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossOrigin: "",
      },
          { rel: "canonical", href: "https://nectar-pay.com/where" },
],
  }),
  component: WherePage,
});

type Market = {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
  /** Bounding box [south, west, north, east] used to filter pins. */
  bbox: [number, number, number, number];
};

const MARKETS: Market[] = [
  {
    id: "dfw",
    label: "Dallas–Fort Worth Metroplex",
    center: [32.85, -97.0],
    zoom: 9,
    bbox: [32.4, -97.7, 33.4, -96.4],
  },
  {
    id: "la",
    label: "Los Angeles Metroplex",
    center: [34.05, -118.25],
    zoom: 9,
    bbox: [33.5, -119.0, 34.5, -117.4],
  },
  {
    id: "denver",
    label: "Denver Metro",
    center: [39.74, -104.99],
    zoom: 9,
    bbox: [39.4, -105.5, 40.1, -104.5],
  },
  {
    id: "nashville",
    label: "Nashville Metro",
    center: [36.16, -86.78],
    zoom: 9,
    bbox: [35.8, -87.3, 36.5, -86.3],
  },
  {
    id: "slc",
    label: "Salt Lake Metro",
    center: [40.76, -111.89],
    zoom: 9,
    bbox: [40.3, -112.3, 41.1, -111.4],
  },
  {
    id: "singapore",
    label: "Singapore",
    center: [1.3521, 103.8198],
    zoom: 11,
    bbox: [1.15, 103.55, 1.5, 104.1],
  },
];

function pinsInBbox(pins: MapPin[], bbox: Market["bbox"]) {
  const [s, w, n, e] = bbox;
  return pins.filter((p) => p.lat >= s && p.lat <= n && p.lng >= w && p.lng <= e);
}

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
            Live merchant maps · 6 launch markets
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Where
          </h1>
          <div className="mt-4 max-w-3xl space-y-4 text-foreground/75">
            <p>
              We're building Nectar.Pay to become the largest crypto payment
              network in the world — and, alongside it, the definitive index
              of merchants who accept crypto. Every pin on the maps below is a
              real business taking Bitcoin, TEXITcoin, and stablecoins through
              Nectar.Pay. We're just getting started: 10,000 POS terminals
              shipping by October 2026.
            </p>
            <p>
              We're concentrating our first push on six metros. Crypto adoption
              isn't just about merchants saying "yes" — it's about consumers
              actively preferring the shops that do. Density in a handful of
              markets creates that habit faster than a scattered map ever could.
            </p>
            <p>
              Outside these six regions? Don't feel left out — join us from
              anywhere. New markets open constantly, and every new merchant,
              rep, and champion moves the map. Check back often, or drop your
              details below and we'll ping you the moment a merchant lights up
              near you.
            </p>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2">
            {MARKETS.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="rounded-md border border-border bg-card/60 px-3 py-1 text-xs text-foreground/80 hover:border-primary/50 hover:text-primary"
              >
                {m.label}
              </a>
            ))}
          </nav>
          <div className="mt-6">
            <a
              href="#notify"
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <BellRing className="h-3.5 w-3.5" />
              Get notified when a merchant opens near you
            </a>
          </div>
        </div>
      </section>

      <NotifySection />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {MARKETS.map((market) => {
            const marketPins = pinsInBbox(pins, market.bbox);
            return (
              <div key={market.id} id={market.id} className="scroll-mt-20">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {market.label}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isLoading
                        ? "Loading…"
                        : marketPins.length === 0
                          ? "No merchants visible yet. Be the first."
                          : `${marketPins.length} merchant${marketPins.length === 1 ? "" : "s"} on the map.`}
                    </p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="flex h-[300px] items-center justify-center rounded-xl border border-border bg-card/40 text-sm text-muted-foreground">
                    Loading map…
                  </div>
                ) : (
                  <ClientMap market={market} pins={marketPins} />
                )}
              </div>
            );
          })}
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
type LeafletMod = typeof import("leaflet");
type ReactLeafletMod = typeof import("react-leaflet");

function ClientMap({ market, pins }: { market: Market; pins: MapPin[] }) {
  const [libs, setLibs] = useState<{ L: LeafletMod; RL: ReactLeafletMod } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("leaflet"), import("react-leaflet")]).then(([L, RL]) => {
      if (!cancelled) setLibs({ L: L as unknown as LeafletMod, RL: RL as unknown as ReactLeafletMod });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const icons = useMemo(() => {
    if (!libs) return null;
    const { L } = libs;
    return {
      fullIcon: L.divIcon({
        className: "",
        html: `<div style="background:oklch(0.68 0.19 62);border:2px solid white;border-radius:9999px;width:18px;height:18px;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      cityIcon: L.divIcon({
        className: "",
        html: `<div style="background:oklch(0.85 0.10 80);border:2px solid white;border-radius:9999px;width:12px;height:12px;opacity:0.85"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    };
  }, [libs]);

  if (!libs || !icons) {
    return <div className="h-[420px] rounded-xl border border-border bg-card/40" />;
  }

  const RL = libs.RL;

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border border-border">
      <RL.MapContainer
        center={market.center}
        zoom={market.zoom}
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
            icon={pin.listing_visibility === "full" ? icons.fullIcon : icons.cityIcon}
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
