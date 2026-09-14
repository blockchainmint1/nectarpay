// Shared response helpers for the public v1 REST API.
// Client-safe (no server-only imports) so route modules can import it directly.

export const API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function apiJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...API_CORS, ...extra },
  });
}

export function apiPreflight() {
  return new Response(null, { status: 204, headers: API_CORS });
}
