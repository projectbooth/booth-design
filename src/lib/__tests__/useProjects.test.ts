import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProjects } from "../useProjects";
import type { Membership, ProjectSummary } from "../api/types";

const activeWorkspace: Membership = { workspace: "acme-analytics", role: "editor" };
vi.mock("../session", () => ({ useSession: () => ({ activeWorkspace }) }));

const listProjects = vi.fn();
vi.mock("../api/client", () => ({ listProjects: (...args: unknown[]) => listProjects(...args) }));

function project(overrides: Partial<ProjectSummary>): ProjectSummary {
  return { slug: "nfl", name: "NFL", ...overrides };
}

describe("useProjects", () => {
  it("starts loading, then resolves with the fetched list", async () => {
    listProjects.mockResolvedValueOnce([project({ slug: "nfl", name: "NFL" })]);
    const { result } = renderHook(() => useProjects());
    expect(result.current.loading).toBe(true);
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.projects).toEqual([project({ slug: "nfl", name: "NFL" })]);
    expect(result.current.error).toBeNull();
    expect(listProjects).toHaveBeenCalledWith("acme-analytics");
  });

  it("surfaces a fetch failure as a plain message, not a thrown error", async () => {
    listProjects.mockRejectedValueOnce(new Error("core unreachable"));
    const { result } = renderHook(() => useProjects());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("core unreachable");
    expect(result.current.projects).toEqual([]);
  });
});
