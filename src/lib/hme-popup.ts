import { z } from "zod";

export const hmeSsoSearch = z.object({ token: z.string().optional(), popup: z.coerce.string().optional(), flow: z.string().optional() });

export const HME_POPUP_TIMEOUT_MS = 180000;

export function validHmeFlow(flow: unknown): flow is string {
  return typeof flow === "string" && /^[a-f0-9]{32}$/.test(flow);
}

export function hmeChannelName(flow: string) {
  return `nectar-hme-${flow}`;
}

export function hmeTicketMessage(data: unknown, flow: string): data is { type: "hme-sso"; flow: string; token: string } {
  if (!data || typeof data !== "object") return false;
  const message = data as Record<string, unknown>;
  return validHmeFlow(flow) && message.flow === flow && message.type === "hme-sso" && typeof message.token === "string" && message.token.length > 0;
}