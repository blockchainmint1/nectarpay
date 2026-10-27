import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StoreRefContext, UUID_RE } from "@/lib/store-ref";

export const Route = createFileRoute("/_authenticated/stores/$storeId")({
  component: StoreLayout,
});

function StoreLayout() {
  const { storeId: param } = Route.useParams();
  const isUuid = UUID_RE.test(param);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data, isLoading } = useQuery({
    queryKey: ["store-ref", param],
    queryFn: async () => {
      const q = supabase.from("stores").select("id, url_slug");
      const { data, error } = await (isUuid ? q.eq("id", param) : q.eq("url_slug", param)).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  // Old /stores/<uuid>/... links keep working, then swap to the readable address.
  useEffect(() => {
    if (!isUuid || !data?.url_slug) return;
    const next = pathname.replace(param, data.url_slug);
    if (next !== pathname) navigate({ to: next as never, replace: true });
  }, [isUuid, data?.url_slug, param, pathname, navigate]);

  if (isLoading) return <div className="px-8 py-10 text-sm text-muted-foreground">Loading…</div>;
  if (!data) {
    return (
      <div className="px-8 py-10">
        <p className="text-sm text-muted-foreground">Store not found.</p>
        <Button asChild variant="link" className="px-0">
          <Link to="/stores">Back to stores</Link>
        </Button>
      </div>
    );
  }
  return (
    <StoreRefContext.Provider value={{ storeId: data.id, storeSlug: data.url_slug }}>
      <Outlet />
    </StoreRefContext.Provider>
  );
}
