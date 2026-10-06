import type { ModuleSummary } from "./api/types";

/**
 * The subset of contracts/module-manifest.md this shell renders against directly:
 * `navGroup` (ADR 0017) and `uiIntegrationMode` (ADR 0005). Kept as a small, testable
 * module (see src/lib/__tests__/manifest.test.ts) so a drift between this shell's
 * assumptions and the actual contract shows up as a failing contract test rather than
 * a silent rendering bug.
 */

export const NAV_GROUPS = ["build", "view", "manage"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export function isNavGroup(value: unknown): value is NavGroup {
  return typeof value === "string" && (NAV_GROUPS as readonly string[]).includes(value);
}

export const UI_INTEGRATION_MODES = ["native", "iframe-proxy"] as const;
export type UiIntegrationMode = (typeof UI_INTEGRATION_MODES)[number];

export function isUiIntegrationMode(value: unknown): value is UiIntegrationMode {
  return (
    typeof value === "string" && (UI_INTEGRATION_MODES as readonly string[]).includes(value)
  );
}

export interface GroupedNav {
  build: ModuleSummary[];
  view: ModuleSummary[];
  manage: ModuleSummary[];
  /** Modules with hasOwnUi but a missing/unrecognized navGroup — ADR 0017's "signal
   *  worth surfacing to the coordinator rather than guessing". Never silently dropped. */
  unplaced: ModuleSummary[];
}

/**
 * Groups installed, nav-visible modules into the shell's three fixed sections
 * (ADR 0017). Module Store, Home, and Settings are shell-level and never pass through
 * here (contracts/module-manifest.md: they "don't use this field").
 *
 * Within each section, modules are sorted by `displayName`. Neither ADR 0017 nor
 * contracts/module-manifest.md defines an order/rank/weight field for modules within a
 * section — this sort is this shell's own choice to make nav order deterministic
 * (previously unsorted, so it depended on whatever order /api/modules happened to
 * return, which could vary between a page reload and in-app navigation). If the
 * manifest contract ever gains an explicit order field, prefer it over this fallback.
 */
export function groupModulesByNav(modules: ModuleSummary[]): GroupedNav {
  const grouped: GroupedNav = { build: [], view: [], manage: [], unplaced: [] };
  for (const m of modules) {
    if (!m.hasOwnUi) continue;
    if (isNavGroup(m.navGroup)) {
      grouped[m.navGroup].push(m);
    } else {
      grouped.unplaced.push(m);
    }
  }
  const byDisplayName = (a: ModuleSummary, b: ModuleSummary) =>
    a.displayName.localeCompare(b.displayName);
  grouped.build.sort(byDisplayName);
  grouped.view.sort(byDisplayName);
  grouped.manage.sort(byDisplayName);
  grouped.unplaced.sort(byDisplayName);
  return grouped;
}
