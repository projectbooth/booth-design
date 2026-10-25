import type { ProjectSummary } from "./api/types";

/**
 * ADR 0124 point 2/5: archived projects never appear (archiving hides, never deletes —
 * their resources stay visible under whatever grouping a module already shows, but you
 * can't newly scope *to* one), and nesting is two levels (a parentless project, then its
 * children). Pure and separately testable from ProjectSwitcher's own Radix rendering —
 * see src/lib/__tests__/projectTree.test.ts.
 */
export function visibleRoots(projects: ProjectSummary[]): ProjectSummary[] {
  const visible = projects.filter((p) => !p.archived);
  return visible.filter((p) => !p.parent);
}

export function visibleChildrenOf(projects: ProjectSummary[], parentSlug: string): ProjectSummary[] {
  return projects.filter((p) => !p.archived && p.parent === parentSlug);
}
