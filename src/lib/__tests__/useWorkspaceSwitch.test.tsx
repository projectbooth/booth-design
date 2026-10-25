import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useWorkspaceSwitch } from "../useWorkspaceSwitch";
import type { Membership } from "../api/types";

// Deliberately a hook-level test, not rendering WorkspaceSwitcher's own Radix dropdown —
// driving that open via simulated clicks is slow and has outright hung in CI for this
// repo's other Radix-based components (Tooltip, ProjectSwitcher). This is the actual
// decision under test (clear project on a real workspace change, leave it alone
// otherwise), with no Radix/DOM involved.
const setActiveWorkspace = vi.fn();
let activeWorkspace: Membership | undefined;
vi.mock("../session", () => ({
  useSession: () => ({ activeWorkspace, setActiveWorkspace }),
}));

function wrapperAt(path: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  };
}

function useHarness() {
  const selectWorkspace = useWorkspaceSwitch();
  const [params] = useSearchParams();
  return { selectWorkspace, project: params.get("project") };
}

describe("useWorkspaceSwitch", () => {
  it("clears the active project when switching to a different workspace", () => {
    activeWorkspace = { workspace: "acme-analytics", role: "owner" };
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperAt("/?project=nfl") });
    expect(result.current.project).toBe("nfl");

    act(() => result.current.selectWorkspace("finance-co"));

    expect(setActiveWorkspace).toHaveBeenCalledWith("finance-co");
    expect(result.current.project).toBeNull();
  });

  it("leaves the active project alone when re-selecting the already-active workspace", () => {
    activeWorkspace = { workspace: "acme-analytics", role: "owner" };
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperAt("/?project=nfl") });

    act(() => result.current.selectWorkspace("acme-analytics"));

    expect(result.current.project).toBe("nfl");
  });
});
