// /pos — layout shell for /pos and /pos/* leaves.
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" },
      { name: "theme-color", content: "#0a0d12" },
    ],
  }),
  component: () => <Outlet />,
});
