import { useEffect, useState } from "react";
import { listProjects } from "./api/client";
import type { ProjectSummary } from "./api/types";
import { useSession } from "./session";

interface ProjectsState {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
}

/** ADR 0124's project registry, fetched once per workspace — no polling. Unlike modules
 *  (which can be installed live from the Store, ARCHITECTURE.md item 70), a workspace's
 *  own project list isn't expected to change out from under a mounted picker often enough
 *  to warrant it; `ProjectSwitcher` refetches on its next mount instead. */
export function useProjects(): ProjectsState {
  const { activeWorkspace } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProjects(activeWorkspace?.workspace)
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspace]);

  return { projects, loading, error };
}
