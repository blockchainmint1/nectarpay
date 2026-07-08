// Floating "Back to POS" pill. Shown only when the app is running inside the
// NectarPay POS APK (native Capacitor) AND the user has navigated somewhere
// outside of /pos — makes it a one-tap trip back to the sale screen.

import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { isNative } from "@/lib/pos-native";

export function PosReturnBar() {
  const location = useLocation();
  const [native, setNative] = useState(false);

  useEffect(() => {
    // isNative reads window.Capacitor — must run after mount.
    setNative(isNative());
  }, []);

  if (!native) return null;
  if (location.pathname.startsWith("/pos")) return null;

  return (
    <Link
      to="/pos"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-sm font-bold tracking-wide text-black shadow-lg shadow-amber-500/30 hover:bg-amber-400 active:scale-95"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <Smartphone className="h-4 w-4" />
      Back to POS
    </Link>
  );
}
