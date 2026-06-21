import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { MarketingNav } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · TEXITcoin Pay" },
      { name: "description", content: "Sign in or create your TEXITcoin Pay account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: search.redirect ?? "/dashboard" });
    }
  }, [authLoading, user, navigate, search.redirect]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. Redirecting…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <div className="rounded-xl border border-border bg-card/60 p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "No card needed. Free during public beta."
              : "Sign in to manage your gateway."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1 7.8 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2 0-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.5 6.5 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43c5 0 9.6-1.9 13-5l-6-5c-1.9 1.3-4.4 2.1-7 2.1-5.2 0-9.7-3.3-11.3-8l-6.6 5C9.5 38.6 16.2 43 24 43z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5C40.4 35.2 44 30.1 44 24c0-1.2 0-2.4-.4-3.5z"
      />
    </svg>
  );
}
