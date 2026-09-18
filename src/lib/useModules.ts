import { useEffect, useState } from "react";
import { listModules } from "./api/client";
import type { ModuleSummary } from "./api/types";
import { useSession } from "./session";

interface ModulesState {
  modules: ModuleSummary[];
  loading: boolean;
  error: string | null;
}

export function useModules(): ModulesState {
  const { activeWorkspace } = useSession();
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listModules(activeWorkspace?.workspace)
      .then((data) => {
        if (!cancelled) {
          setModules(data);
          setError(null);
        }
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

  return { modules, loading, error };
}
