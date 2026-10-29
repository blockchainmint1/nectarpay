import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/card-partners")({
  beforeLoad: () => { throw redirect({ to: "/admin/give", replace: true }); },
});
