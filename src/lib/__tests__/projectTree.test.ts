import { describe, expect, it } from "vitest";
import { visibleChildrenOf, visibleRoots } from "../projectTree";
import type { ProjectSummary } from "../api/types";

function project(overrides: Partial<ProjectSummary>): ProjectSummary {
  return { slug: "nfl", name: "NFL", ...overrides };
}

describe("visibleRoots", () => {
  it("returns only parentless, non-archived projects", () => {
    const projects = [
      project({ slug: "finance", name: "Finance" }),
      project({ slug: "finance-dev", name: "Finance (dev)", parent: "finance" }),
      project({ slug: "nfl", name: "NFL" }),
      project({ slug: "old", name: "Old", archived: true }),
    ];
    expect(visibleRoots(projects).map((p) => p.slug)).toEqual(["finance", "nfl"]);
  });

  it("excludes an archived root even though it has no parent", () => {
    const projects = [project({ slug: "old", name: "Old", archived: true })];
    expect(visibleRoots(projects)).toEqual([]);
  });
});

describe("visibleChildrenOf", () => {
  it("returns only non-archived children of the given parent", () => {
    const projects = [
      project({ slug: "finance-dev", name: "Finance (dev)", parent: "finance" }),
      project({ slug: "finance-prod", name: "Finance (prod)", parent: "finance" }),
      project({ slug: "finance-qat", name: "Finance (qat)", parent: "finance", archived: true }),
      project({ slug: "nfl", name: "NFL" }),
    ];
    expect(visibleChildrenOf(projects, "finance").map((p) => p.slug)).toEqual([
      "finance-dev",
      "finance-prod",
    ]);
  });

  it("returns an empty list for a slug with no children", () => {
    const projects = [project({ slug: "nfl", name: "NFL" })];
    expect(visibleChildrenOf(projects, "nfl")).toEqual([]);
  });
});
