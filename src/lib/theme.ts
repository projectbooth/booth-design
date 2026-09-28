import { useCallback, useSyncExternalStore } from "react";

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
 * Module-level store, not per-component state: every `useTheme()` call site (NavRail's
 * toggle, NativeModulePane, IframeProxyPane, SettingsPage) must observe the *same*
 * live value, not its own independent copy. A plain `useState` here looked equivalent
 * at a glance but silently wasn't — verified directly (a spike test toggling from one
 * component left a sibling component's own `useTheme()` unchanged) before rewriting
 * this: two components each holding local state via the same hook never actually share
 * it, and the sibling only ever "looked" in sync because CSS theming reads the DOM's
 * `data-theme` attribute directly, not React state — the desync was invisible until
 * something (ADR 0075's iframe theme sync) needed the JS value itself to update
 * live in a component that isn't where the toggle lives.
 */
let currentTheme: Theme = readInitialTheme();
const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // best-effort only — private window or blocked storage just resets on reload
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Theme {
  return currentTheme;
}

/**
 * Owns the `data-theme` attribute on <html> — the same convention
 * booth-module-store's Tailwind config keys off (see tailwind.config.ts). index.html
 * sets this attribute before first paint from localStorage; this hook takes over after
 * hydration and keeps localStorage in sync. Backed by a shared module-level store
 * (see comment above `currentTheme`) so every call site re-renders together.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  }, []);

  return { theme, setTheme, toggleTheme };
}
