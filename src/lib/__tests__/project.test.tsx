import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useActiveProject } from "../project";

const STORAGE_KEY = "booth-design-active-project";

function wrapperAt(path: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useActiveProject", () => {
  it("defaults to All projects (null) with no URL param and nothing remembered", () => {
    const { result } = renderHook(() => useActiveProject(), { wrapper: wrapperAt("/") });
    expect(result.current.activeProject).toBeNull();
  });

  it("reads an existing ?project= param directly, ignoring localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "nfl");
    const { result } = renderHook(() => useActiveProject(), {
      wrapper: wrapperAt("/?project=finance"),
    });
    expect(result.current.activeProject).toBe("finance");
  });

  it("seeds a session with no URL param from the remembered project", async () => {
    localStorage.setItem(STORAGE_KEY, "finance-dev");
    const { result } = renderHook(() => useActiveProject(), { wrapper: wrapperAt("/") });
    await act(async () => {});
    expect(result.current.activeProject).toBe("finance-dev");
  });

  it("setActiveProject(slug) updates state and remembers it", () => {
    const { result } = renderHook(() => useActiveProject(), { wrapper: wrapperAt("/") });
    act(() => result.current.setActiveProject("nfl"));
    expect(result.current.activeProject).toBe("nfl");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("nfl");
  });

  it("setActiveProject(null) clears both the param and the remembered value", () => {
    const { result } = renderHook(() => useActiveProject(), {
      wrapper: wrapperAt("/?project=nfl"),
    });
    localStorage.setItem(STORAGE_KEY, "nfl");
    act(() => result.current.setActiveProject(null));
    expect(result.current.activeProject).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
