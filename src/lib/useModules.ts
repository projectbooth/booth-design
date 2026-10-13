import { useEffect, useState } from "react";
import { listModules } from "./api/client";
import type { ModuleSummary } from "./api/types";
import { useSession } from "./session";

interface ModulesState {
  modules: ModuleSummary[];
  loading: boolean;
  error: string | null;
}

// ARCHITECTURE.md item 70: without this, a module installed from the Module Store (or
// anywhere else) only shows up in the nav after a full browser reload, because this was
// previously a fetch-once-on-mount hook. Exported so the test can advance exactly this
// many fake-timer milliseconds rather than a duplicated magic number.
export const POLL_INTERVAL_MS = 30_000;

/** Whether two module lists differ in any way the nav (or anything else reading this
 *  hook) actually renders: identity, label, status, and routing. Order-independent —
 *  core's list ordering isn't a contract, and groupModulesByNav re-sorts for display
 *  regardless — so a background poll that comes back merely reordered must not cause a
 *  state update either. */
function modulesChanged(previous: ModuleSummary[], next: ModuleSummary[]): boolean {
  if (previous.length !== next.length) return true;
  const byId = new Map(previous.map((m) => [m.id, m]));
  for (const module of next) {
    const prev = byId.get(module.id);
    if (!prev) return true;
    if (
      prev.displayName !== module.displayName ||
      prev.phase !== module.phase ||
      prev.navPath !== module.navPath ||
      prev.adminNavPath !== module.adminNavPath
    ) {
      return true;
    }
  }
  return false;
}

export function useModules(): ModulesState {
  const { activeWorkspace } = useSession();
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Replaces the list only when it actually changed (modulesChanged above), via the
    // setState-functional-update form: returning the same `prev` reference is an
    // `Object.is` bail-out, so React re-renders nothing downstream (the nav, the
    // selected module, the open pane) for an identical refetch.
    function applyModules(data: ModuleSummary[]) {
      setModules((prev) => (modulesChanged(prev, data) ? data : prev));
    }

    // The initial fetch for this workspace: shows the loading state and surfaces a
    // failure, same as before this hook polled at all.
    setLoading(true);
    listModules(activeWorkspace?.workspace)
      .then((data) => {
        if (cancelled) return;
        applyModules(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Every later fetch (interval tick, regained focus/visibility) is a background
    // refresh: never touches `loading` or `error` — a failure here just keeps the last
    // good list and tries again on the next tick, since the initial-load error state is
    // the only one worth showing (a transient blip while the tab was in the background
    // shouldn't flash a banner over a nav rail that's otherwise working fine).
    function refetchInBackground() {
      listModules(activeWorkspace?.workspace)
        .then((data) => {
          if (!cancelled) applyModules(data);
        })
        .catch(() => {});
    }

    function pollIfVisible() {
      if (document.visibilityState === "visible") refetchInBackground();
    }

    // The interval itself keeps running while hidden (so it doesn't need re-arming on
    // every visibility flip); it just never fetches on a tick where the tab isn't
    // visible, which is what "pauses while hidden" needs to mean observably.
    const interval = setInterval(pollIfVisible, POLL_INTERVAL_MS);
    // A regained-focus/visibility refetch is immediate, not merely "the interval will
    // catch up eventually" — the Store's own install flow (a separate task) wants the
    // nav caught up right when an operator switches back to this tab.
    document.addEventListener("visibilitychange", pollIfVisible);
    window.addEventListener("focus", pollIfVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", pollIfVisible);
      window.removeEventListener("focus", pollIfVisible);
    };
  }, [activeWorkspace?.workspace]);

  return { modules, loading, error };
}
