import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Bell,
  Mail,
  MessageCircle,
  Check,
  X,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import {
  getNotificationPrefs,
  saveNotificationPrefs,
  createTelegramBindCode,
  disconnectTelegram,
  getNotificationLog,
  type NotificationPrefs,
} from "@/lib/notify.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const EVENT_LABELS: Record<string, { label: string; help: string }> = {
  invoice_paid: { label: "Invoice paid", help: "An incoming payment fully settled an invoice." },
  invoice_underpaid: { label: "Invoice underpaid", help: "A payment landed but is short of the invoice amount." },
  invoice_expired: { label: "Invoice expired", help: "Time window closed without payment." },
  deposit_received: { label: "TXC deposit received", help: "Your TXC credit balance was topped up." },
  plan_renewed: { label: "Plan renewed", help: "Monthly subscription debit succeeded." },
  grace_warning: { label: "Billing warnings", help: "Renewal failed; grace period alerts." },
};

function NotificationsPage() {
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const fetchLog = useServerFn(getNotificationLog);
  const savePrefs = useServerFn(saveNotificationPrefs);
  const createCode = useServerFn(createTelegramBindCode);
  const disconnect = useServerFn(disconnectTelegram);
  const qc = useQueryClient();

  const prefsQ = useQuery({ queryKey: ["notification-prefs"], queryFn: () => fetchPrefs() });
  const logQ = useQuery({ queryKey: ["notification-log"], queryFn: () => fetchLog() });

  const saveMut = useMutation({
    mutationFn: (data: Partial<NotificationPrefs>) => savePrefs({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast.success("Preferences saved");
    },
    onError: (e) => toast.error(`Save failed: ${(e as Error).message}`),
  });

  const bindMut = useMutation({
    mutationFn: () => createCode(),
    onError: (e) => toast.error(`Bind code failed: ${(e as Error).message}`),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast.success("Telegram disconnected");
    },
  });

  const prefs = prefsQ.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get instant alerts when payments land, deposits clear, and billing events happen.
        </p>
      </header>

      {!prefs ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Channels */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Email card */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Email</CardTitle>
                    <p className="text-xs text-muted-foreground">Delivered to your inbox</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.email_enabled}
                  onCheckedChange={(v) => saveMut.mutate({ ...prefs, email_enabled: v })}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email address</Label>
                  <Input
                    type="email"
                    placeholder="you@store.com"
                    defaultValue={prefs.email_address ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (prefs.email_address ?? "")) {
                        saveMut.mutate({ ...prefs, email_address: e.target.value });
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-amber-500/90">
                  Email delivery turns on once your sender domain is configured. Ask in chat to enable
                  it — Telegram works immediately.
                </p>
              </CardContent>
            </Card>

            {/* Telegram card */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Telegram</CardTitle>
                    <p className="text-xs text-muted-foreground">Real-time push to your phone</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.telegram_enabled}
                  disabled={!prefs.telegram_chat_id}
                  onCheckedChange={(v) => saveMut.mutate({ ...prefs, telegram_enabled: v })}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {prefs.telegram_chat_id ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                        <Check className="mr-1 h-3 w-3" /> Connected
                      </Badge>
                      {prefs.telegram_username && (
                        <span className="text-muted-foreground">@{prefs.telegram_username}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnectMut.mutate()}
                      disabled={disconnectMut.isPending}
                    >
                      <X className="mr-1 h-3 w-3" /> Disconnect
                    </Button>
                  </div>
                ) : bindMut.data ? (
                  <TelegramBindBox
                    code={bindMut.data.code}
                    deepLink={bindMut.data.deepLink}
                    botUsername={bindMut.data.botUsername}
                  />
                ) : (
                  <Button
                    onClick={() => bindMut.mutate()}
                    disabled={bindMut.isPending}
                    className="w-full"
                  >
                    {bindMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Connect Telegram
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Events</CardTitle>
              <p className="text-xs text-muted-foreground">
                Choose which events trigger notifications across enabled channels.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(EVENT_LABELS).map(([key, { label, help }]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{help}</div>
                  </div>
                  <Switch
                    checked={prefs.events[key] !== false}
                    onCheckedChange={(v) =>
                      saveMut.mutate({
                        ...prefs,
                        events: { ...prefs.events, [key]: v },
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent log */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Recent activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!logQ.data?.length ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                <div className="space-y-2">
                  {logQ.data.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{row.subject ?? row.event}</span>
                          <span>·</span>
                          <span>{row.channel}</span>
                          <span>·</span>
                          <span>{new Date(row.created_at).toLocaleString()}</span>
                        </div>
                        {row.body && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">{row.body}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          row.status === "sent"
                            ? "border-emerald-500/40 text-emerald-400"
                            : row.status === "failed"
                              ? "border-rose-500/40 text-rose-400"
                              : "border-amber-500/40 text-amber-400"
                        }
                      >
                        {row.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TelegramBindBox({
  code,
  deepLink,
  botUsername,
}: {
  code: string;
  deepLink: string;
  botUsername: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
      <p className="text-xs">
        1. Open <span className="font-mono">@{botUsername}</span> in Telegram &nbsp;
        2. Send this command:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs">
          /start {code}
        </code>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(`/start ${code}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <Separator />
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Or open Telegram directly <ExternalLink className="h-3 w-3" />
      </a>
      <p className="text-[10px] text-muted-foreground">Code expires in 15 minutes.</p>
    </div>
  );
}
