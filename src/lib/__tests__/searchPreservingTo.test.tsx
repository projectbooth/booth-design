import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useSearchPreservingTo } from "../searchPreservingTo";

function wrapperAt(path: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  };
}

describe("useSearchPreservingTo", () => {
  it("carries the current ?project= through to a different route", () => {
    const { result } = renderHook(() => useSearchPreservingTo("/storage"), {
      wrapper: wrapperAt("/pipeline?project=nfl"),
    });
    expect(result.current).toEqual({ pathname: "/storage", search: "?project=nfl" });
  });

  it("stays an empty search when there's nothing to preserve", () => {
    const { result } = renderHook(() => useSearchPreservingTo("/store"), {
      wrapper: wrapperAt("/"),
    });
    expect(result.current).toEqual({ pathname: "/store", search: "" });
  });
});
