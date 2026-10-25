import { useActiveProject } from "./project";
import { useSession } from "./session";

/**
 * ADR 0124: a project is workspace-scoped (`contracts/projects.md`: "Registry is
 * workspace-scoped"), so a slug that's meaningful in one workspace may not exist — or
 * may mean something else entirely — in another. Switching workspace clears the active
 * project rather than carrying it over. Restoring a per-workspace remembered project is
 * a later refinement, not built here.
 */
export function useWorkspaceSwitch() {
  const { activeWorkspace, setActiveWorkspace } = useSession();
  const { setActiveProject } = useActiveProject();

  return function selectWorkspace(slug: string) {
    setActiveWorkspace(slug);
    if (slug !== activeWorkspace?.workspace) setActiveProject(null);
  };
}
