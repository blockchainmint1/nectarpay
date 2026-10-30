import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for /docs and its guide pages; the main guide lives in docs.index.tsx.
export const Route = createFileRoute("/docs")({
  component: () => <Outlet />,
});
