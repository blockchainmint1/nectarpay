import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DocHeader, DocBody } from "@/components/knowledge-shell";
import { getMemberHeatPoints } from "@/lib/members-geo.functions";

export const Route = createFileRoute("/_authenticated/admin/knowledge/members-heatmap")({
  head: () => ({
    meta: [
      { title: "Members Heatmap · Knowledge · Nectar-PAY" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossOrigin: "",
      },
    ],
  }),
  component: MembersHeatmapPage,
});

function MembersHeatmapPage() {
  const fetchPoints = useServerFn(getMemberHeatPoints);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "members-heatmap"],
    queryFn: () => fetchPoints(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <DocHeader
        eyebrow="Ecosystem · US Members"
        title="Members Heatmap"
        lede="TEXITcoin community members across the United States, geocoded by ZIP centroid. Anonymous — no PII stored."
      />
      <DocBody>
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          {isLoading ? <span>Loading…</span> : null}
          {error ? <span className="text-red-600">Failed to load</span> : null}
          {data ? (
            <>
              <span>
                <strong className="text-ink">{data.total.toLocaleString()}</strong> members
              </span>
              <span>
                <strong className="text-ink">{data.points.length.toLocaleString()}</strong> hotspots
              </span>
            </>
          ) : null}
        </div>
        <HeatMap points={data?.points ?? []} />
      </DocBody>
    </>
  );
}

function HeatMap({ points }: { points: Array<{ lat: number; lng: number; count: number }> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<unknown>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      if (cancelled || !containerRef.current) return;

      const LAny = L as unknown as {
        map: (el: HTMLElement, opts?: unknown) => unknown;
        tileLayer: (url: string, opts?: unknown) => { addTo: (m: unknown) => unknown };
        heatLayer: (
          data: Array<[number, number, number]>,
          opts?: unknown,
        ) => { addTo: (m: unknown) => unknown; setLatLngs: (d: Array<[number, number, number]>) => void };
      };

      if (!mapRef.current) {
        const m = LAny.map(containerRef.current, {
          center: [39.5, -98.35],
          zoom: 4,
          scrollWheelZoom: true,
        });
        LAny.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 18,
        }).addTo(m);
        mapRef.current = m;
      }

      const max = points.reduce((a, p) => Math.max(a, p.count), 1);
      const heatData = points.map((p) => [p.lat, p.lng, p.count / max] as [number, number, number]);

      if (layerRef.current) {
        (layerRef.current as { setLatLngs: (d: Array<[number, number, number]>) => void }).setLatLngs(heatData);
      } else {
        layerRef.current = LAny.heatLayer(heatData, {
          radius: 18,
          blur: 22,
          maxZoom: 10,
        }).addTo(mapRef.current);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [points]);

  return (
    <div
      ref={containerRef}
      className="h-[70vh] w-full overflow-hidden rounded-xl border border-border"
    />
  );
}
