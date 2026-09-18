import { describe, expect, it } from "vitest";
import { findModuleForPath } from "../ModuleRoutePage";
import type { ModuleSummary } from "@/lib/api/types";

function module(overrides: Partial<ModuleSummary>): ModuleSummary {
  return { id: "mod", displayName: "Mod", version: "0.1.0", hasOwnUi: true, ...overrides };
}

describe("findModuleForPath", () => {
  const storage = module({ id: "storage", navPath: "/storage", adminNavPath: "/storage/admin" });
  const catalog = module({ id: "catalog", navPath: "/catalog" });
  const modules = [storage, catalog];

  it("matches an exact navPath", () => {
    expect(findModuleForPath(modules, "/catalog")).toBe(catalog);
  });

  it("matches a sub-route beneath navPath", () => {
    expect(findModuleForPath(modules, "/storage/buckets/abc")).toBe(storage);
  });

  it("matches adminNavPath (ADR 0023) distinctly from navPath", () => {
    expect(findModuleForPath(modules, "/storage/admin")).toBe(storage);
  });

  it("does not match a path that merely shares a prefix string", () => {
    // /storage-extra should NOT match /storage (no path-segment boundary)
    expect(findModuleForPath(modules, "/storage-extra")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(findModuleForPath(modules, "/nonexistent")).toBeNull();
  });
});
