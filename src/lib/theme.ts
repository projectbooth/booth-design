import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "booth-design-theme";

function readInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.dataset.theme;
    if (attr === "light" || attr === "dark") return attr;
  }
  return "dark";
}

/**
 * Owns the `data-theme` attribute on <html> — the same convention
 * booth-module-store's Tailwind config keys off (see tailwind.config.ts). index.html
 * sets this attribute before first paint from localStorage; this hook takes over after
 * hydration and keeps localStorage in sync.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // best-effort only — private window or blocked storage just resets on reload
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}
