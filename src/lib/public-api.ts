// Shared response helpers for the public v1 REST API.
// Client-safe (no server-only imports) so route modules can import it directly.

export const API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining",
} as const;

/** Requests allowed per API key per minute. */
export const API_RATE_LIMIT_PER_MIN = 120;

const CODE_BY_STATUS: Record<number, string> = {
  400: "invalid_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "invalid_request",
  429: "rate_limited",
  500: "server_error",
  502: "upstream_error",
  503: "unavailable",
};

export function apiJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  // Every error gets a stable machine-readable `code` alongside the human `error` message.
  if (status >= 400 && body && typeof body === "object" && "error" in body && !("code" in body)) {
    body = { ...(body as object), code: CODE_BY_STATUS[status] ?? (status >= 500 ? "server_error" : "invalid_request") };
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...API_CORS, ...extra },
  });
}

export function apiPreflight() {
  return new Response(null, { status: 204, headers: API_CORS });
}
