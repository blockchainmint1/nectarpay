import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewSignup } from "@/lib/notify-events.functions";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function maybeNotifySignup(user: User | null | undefined) {
  if (!user) return;
  const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0;
  // Only ping admins if the account was created in the last 5 minutes,
  // and only once per browser via a localStorage marker.
  if (!createdMs || Date.now() - createdMs > 5 * 60 * 1000) return;
  try {
    const key = `nectar.signup-notified.${user.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
  notifyNewSignup().catch((e) => console.error("[auth] notify signup failed", e));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener FIRST so we never miss an event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (event === "SIGNED_IN") maybeNotifySignup(newSession?.user);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      maybeNotifySignup(data.session?.user);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
