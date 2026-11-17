import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsDesktop } from "../useIsDesktop";

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initialMatches,
    media: "(min-width: 769px)",
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

describe("useIsDesktop", () => {
  it("reads the viewport synchronously on mount, no flash of the wrong value", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it("reflects a narrow viewport", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it("updates when the viewport crosses the breakpoint (a resize or rotation)", () => {
    const { flipTo } = mockMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
    act(() => flipTo(true));
    expect(result.current).toBe(true);
  });
});
