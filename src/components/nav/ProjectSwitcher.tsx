import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useActiveProject } from "@/lib/project";
import { visibleChildrenOf, visibleRoots } from "@/lib/projectTree";
import { useProjects } from "@/lib/useProjects";
import type { ProjectSummary } from "@/lib/api/types";

/**
 * ADR 0124's shell-header picker, placed here below WorkspaceSwitcher rather than in a
 * new top-level header bar — see this repo's design note
 * (docs/design-project-picker-help-docs-pipeline-layout.md §1) for why. Picking a parent
 * includes its children, which is a module's own job to compute from this same list, not
 * this component's (ADR point 5). Tree filtering itself lives in src/lib/projectTree.ts,
 * tested separately from this component's own Radix rendering.
 *
 * Behind the features.projects flag (src/lib/featureFlags.ts) until booth-core ships the
 * registry this calls.
 */
export function ProjectSwitcher() {
  const { activeProject, setActiveProject } = useActiveProject();
  const { projects, loading, error } = useProjects();

  if (loading) {
    return (
      <div className="mb-4 h-[54px] animate-pulse rounded-lg border border-border-subtle bg-bg-elevated" />
    );
  }

  const roots = visibleRoots(projects);
  const activeName = projects.find((p) => p.slug === activeProject && !p.archived)?.name;

  return (
    <div className="mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-md border border-border bg-bg-elevated px-2.5 py-2 text-left text-text outline-none focus-visible:ring-2">
            <span className="flex min-w-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Project
              </span>
              <span className="truncate text-[13px] font-semibold">
                {activeName ?? "All projects"}
              </span>
            </span>
            <ChevronDownIcon className="shrink-0 text-text-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(var(--nav-width)-24px)]">
          <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setActiveProject(null)}>
            <span className="flex-1 truncate">All projects</span>
          </DropdownMenuItem>
          {roots.length > 0 && <DropdownMenuSeparator />}
          {roots.map((root) => (
            <ProjectRow key={root.slug} project={root} onSelect={setActiveProject}>
              {visibleChildrenOf(projects, root.slug).map((child) => (
                <ProjectRow key={child.slug} project={child} indent onSelect={setActiveProject} />
              ))}
            </ProjectRow>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Outside DropdownMenuContent on purpose: Radix only mounts that content while the
       *  menu is open, which would hide a load failure behind a dropdown nobody has
       *  opened yet. "All projects" stays usable regardless of this error. */}
      {error && (
        <p className="mt-1 px-0.5 text-[11px] text-text-muted">Projects couldn't be listed ({error}).</p>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  indent = false,
  onSelect,
  children,
}: {
  project: ProjectSummary;
  indent?: boolean;
  onSelect: (slug: string) => void;
  children?: ReactNode;
}) {
  return (
    <>
      <DropdownMenuItem onSelect={() => onSelect(project.slug)} className={indent ? "pl-6" : undefined}>
        {project.color && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} aria-hidden />
        )}
        <span className="flex-1 truncate">{project.name}</span>
      </DropdownMenuItem>
      {children}
    </>
  );
}
