import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHasHover } from "../useHasHover";

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initialMatches,
    media: "(hover: hover)",
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    flipTo: (matches: boolean) => {
      mql.matches = matches;
      listeners.forEach((l) => l());
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useHasHover", () => {
  it("reports hover-capable input", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useHasHover());
    expect(result.current).toBe(true);
  });

  it("reports a touch-only input with no hover", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useHasHover());
    expect(result.current).toBe(false);
  });

  it("updates if the input capability changes (a mouse plugged into a tablet)", () => {
    const { flipTo } = mockMatchMedia(false);
    const { result } = renderHook(() => useHasHover());
    expect(result.current).toBe(false);
    act(() => flipTo(true));
    expect(result.current).toBe(true);
  });
});
