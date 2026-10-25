import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * ADR 0124's project filter: `?project=<slug>` on the URL is the source of truth while
 * mounted (shared for free across every consumer — NavRail's ProjectSwitcher,
 * IframeProxyPane — since they all render under the same <BrowserRouter>, unlike
 * useTheme()'s module-level store, which exists because theme has no such shared render
 * tree to piggyback on). localStorage only seeds a session that lands with no `project`
 * param yet; "All projects" clears the param rather than storing an empty string, so
 * there is nothing to distinguish from "never chosen" — both just mean no param.
 */
const STORAGE_KEY = "booth-design-active-project";

function readRemembered(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // best-effort only — private window or blocked storage just stays unseeded
  }
}

export function useActiveProject() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProject = searchParams.get("project");

  // Seeds a session that lands with no `project` param from whatever this user last
  // chose, so the URL becomes shareable going forward — a one-time effect, not a render-
  // time side effect, and a no-op once the URL actually has (or has chosen not to have) a
  // value.
  useEffect(() => {
    if (activeProject !== null) return;
    const remembered = readRemembered();
    if (!remembered) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("project", remembered);
        return next;
      },
      { replace: true },
    );
    // Only re-runs if the URL's own project param changes out from under this effect
    // (e.g. a later render clears it); setSearchParams itself is stable across renders.
  }, [activeProject, setSearchParams]);

  const setActiveProject = useCallback(
    (slug: string | null) => {
      try {
        if (slug) localStorage.setItem(STORAGE_KEY, slug);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // best-effort only
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (slug) next.set("project", slug);
          else next.delete("project");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { activeProject, setActiveProject };
}
