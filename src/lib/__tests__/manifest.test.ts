import { describe, expect, it } from "vitest";
import { groupModulesByNav, isNavGroup, isUiIntegrationMode } from "../manifest";
import type { ModuleSummary } from "../api/types";

// Contract tests (contracts/testing-strategy.md layer 2): validates this shell's
// assumptions against contracts/module-manifest.md's navGroup (ADR 0017) and
// uiIntegrationMode (ADR 0005) enums, so a contract drift fails here instead of
// showing up as a silent rendering bug.

describe("isNavGroup", () => {
  it("accepts exactly build/view/manage", () => {
    expect(isNavGroup("build")).toBe(true);
    expect(isNavGroup("view")).toBe(true);
    expect(isNavGroup("manage")).toBe(true);
  });

  it("rejects unrecognized or placeholder categories", () => {
    // The wireframe's Module Store category tags (Data/Compute/Analytics/Governance)
    // are explicitly NOT real navGroup values per this repo's brief open question #2.
    expect(isNavGroup("governance")).toBe(false);
    expect(isNavGroup("analytics")).toBe(false);
    expect(isNavGroup(undefined)).toBe(false);
    expect(isNavGroup("")).toBe(false);
  });
});

describe("isUiIntegrationMode", () => {
  it("accepts exactly native/iframe-proxy", () => {
    expect(isUiIntegrationMode("native")).toBe(true);
    expect(isUiIntegrationMode("iframe-proxy")).toBe(true);
    expect(isUiIntegrationMode("embedded")).toBe(false);
  });
});

function module(overrides: Partial<ModuleSummary>): ModuleSummary {
  return {
    id: "mod",
    displayName: "Mod",
    version: "0.1.0",
    hasOwnUi: true,
    ...overrides,
  };
}

describe("groupModulesByNav", () => {
  it("buckets modules by their declared navGroup", () => {
    const grouped = groupModulesByNav([
      module({ id: "pipeline", navGroup: "build" }),
      module({ id: "catalog", navGroup: "view" }),
      module({ id: "storage", navGroup: "manage" }),
    ]);
    expect(grouped.build.map((m) => m.id)).toEqual(["pipeline"]);
    expect(grouped.view.map((m) => m.id)).toEqual(["catalog"]);
    expect(grouped.manage.map((m) => m.id)).toEqual(["storage"]);
    expect(grouped.unplaced).toHaveLength(0);
  });

  it("skips modules without hasOwnUi entirely", () => {
    const grouped = groupModulesByNav([module({ id: "headless", hasOwnUi: false, navGroup: "build" })]);
    expect(grouped.build).toHaveLength(0);
    expect(grouped.unplaced).toHaveLength(0);
  });

  it("surfaces modules with hasOwnUi but a missing/invalid navGroup as unplaced, never dropped or guessed", () => {
    const grouped = groupModulesByNav([
      module({ id: "no-group", navGroup: undefined }),
      module({ id: "bad-group", navGroup: "governance" as never }),
    ]);
    expect(grouped.unplaced.map((m) => m.id)).toEqual(["no-group", "bad-group"]);
    expect(grouped.build).toHaveLength(0);
    expect(grouped.view).toHaveLength(0);
    expect(grouped.manage).toHaveLength(0);
  });
});
