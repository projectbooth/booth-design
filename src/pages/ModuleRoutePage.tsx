import { useLocation } from "react-router-dom";
import { ContentPane } from "@/components/shell/ContentPane";
import { useModules } from "@/lib/useModules";
import type { ModuleSummary } from "@/lib/api/types";

export function findModuleForPath(modules: ModuleSummary[], pathname: string): ModuleSummary | null {
  // Longest-prefix match: a module's navPath may have sub-routes beneath it
  // (e.g. /storage/buckets/abc), and adminNavPath is a distinct route for owners
  // alongside the regular navPath (ADR 0023) — either can match.
  let best: ModuleSummary | null = null;
  let bestLength = -1;
  for (const m of modules) {
    for (const candidate of [m.navPath, m.adminNavPath]) {
      if (!candidate) continue;
      if ((pathname === candidate || pathname.startsWith(candidate + "/")) && candidate.length > bestLength) {
        best = m;
        bestLength = candidate.length;
      }
    }
  }
  return best;
}

/** Catch-all route: resolves the current path against installed modules' declared
 *  navPath/adminNavPath at runtime, since the route set changes as modules install/
 *  uninstall (no build-time route table is possible here). */
export function ModuleRoutePage() {
  const { pathname } = useLocation();
  const { modules, loading } = useModules();

  if (loading) {
    return <div className="p-8 text-[13.5px] text-text-muted">Loading…</div>;
  }

  const module = findModuleForPath(modules, pathname);
  if (!module) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-[15px] font-semibold text-text">Nothing here</h2>
        <p className="max-w-sm text-[13.5px] text-text-muted">
          No installed module owns this route. Install it from the Module Store to reserve its
          spot in navigation.
        </p>
      </div>
    );
  }

  return <ContentPane module={module} />;
}
