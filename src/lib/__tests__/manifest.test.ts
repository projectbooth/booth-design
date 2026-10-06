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

  // Neither ADR 0017 nor contracts/module-manifest.md defines an order/rank field for
  // modules within a section, so this shell sorts by displayName instead — the point of
  // this test is that the result does not depend on whatever order /api/modules happens
  // to return (a real droplet showed Pipelines/Notebooks swapping, and Manage reordering,
  // between a full page reload and in-app navigation).
  it("sorts each section by displayName regardless of input order", () => {
    const pool = [
      module({ id: "pipeline", displayName: "Pipelines", navGroup: "build" }),
      module({ id: "notebooks", displayName: "Notebooks", navGroup: "build" }),
      module({ id: "catalog", displayName: "Catalog", navGroup: "view" }),
      module({ id: "logging", displayName: "Logging", navGroup: "view" }),
      module({ id: "storage", displayName: "Storage", navGroup: "manage" }),
      module({ id: "database", displayName: "Database", navGroup: "manage" }),
      module({ id: "lakehouse", displayName: "Lakehouse", navGroup: "manage" }),
    ];

    // Deterministic PRNG (mulberry32) so a failure is reproducible, not flaky.
    function mulberry32(seed: number) {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function shuffle<T>(arr: T[], rand: () => number): T[] {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    const expected = groupModulesByNav(pool);

    for (let seed = 1; seed <= 10; seed++) {
      const shuffled = shuffle(pool, mulberry32(seed));
      const grouped = groupModulesByNav(shuffled);
      expect(grouped.build.map((m) => m.id)).toEqual(expected.build.map((m) => m.id));
      expect(grouped.view.map((m) => m.id)).toEqual(expected.view.map((m) => m.id));
      expect(grouped.manage.map((m) => m.id)).toEqual(expected.manage.map((m) => m.id));
    }

    expect(expected.build.map((m) => m.displayName)).toEqual(["Notebooks", "Pipelines"]);
    expect(expected.view.map((m) => m.displayName)).toEqual(["Catalog", "Logging"]);
    expect(expected.manage.map((m) => m.displayName)).toEqual(["Database", "Lakehouse", "Storage"]);
  });
});
