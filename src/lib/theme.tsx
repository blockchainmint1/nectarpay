import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "txc-pay-theme";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };
const ThemeContext = createContext<Ctx | null>(null);

function readInitial(): Theme {
  if (typeof document === "undefined") return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Inline script string — runs before React hydrates to prevent FOUC.
export const themeBootstrapScript = `
(function(){try{
  var s = localStorage.getItem('${STORAGE_KEY}');
  var t = (s === 'light' || s === 'dark') ? s : 'dark';
  var c = document.documentElement.classList;
  c.remove('light','dark'); c.add(t);
}catch(e){document.documentElement.classList.add('dark');}})();
`;
