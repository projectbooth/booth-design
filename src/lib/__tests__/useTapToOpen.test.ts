import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTapToOpen } from "../useTapToOpen";

function firePointerDown(target: Element | Document) {
  target.dispatchEvent(new Event("pointerdown", { bubbles: true }));
}

describe("useTapToOpen", () => {
  it("starts closed by default", () => {
    const { result } = renderHook(() => useTapToOpen());
    expect(result.current.open).toBe(false);
  });

  it("honors an initial open state", () => {
    const { result } = renderHook(() => useTapToOpen(true));
    expect(result.current.open).toBe(true);
  });

  it("toggle() flips it open, then closed again", () => {
    const { result } = renderHook(() => useTapToOpen());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it("closes on a pointerdown outside the container", () => {
    const { result } = renderHook(() => useTapToOpen(true));
    const container = document.createElement("div");
    const inside = document.createElement("button");
    container.appendChild(inside);
    document.body.appendChild(container);
    // @ts-expect-error -- test double for the ref's target element
    result.current.containerRef.current = container;

    act(() => firePointerDown(document.body));
    expect(result.current.open).toBe(false);

    document.body.removeChild(container);
  });

  it("stays open for a pointerdown inside the container", () => {
    const { result } = renderHook(() => useTapToOpen(true));
    const container = document.createElement("div");
    const inside = document.createElement("button");
    container.appendChild(inside);
    document.body.appendChild(container);
    // @ts-expect-error -- test double for the ref's target element
    result.current.containerRef.current = container;

    act(() => firePointerDown(inside));
    expect(result.current.open).toBe(true);

    document.body.removeChild(container);
  });

  it("doesn't listen for outside taps while already closed", () => {
    const { result } = renderHook(() => useTapToOpen(false));
    act(() => firePointerDown(document.body));
    expect(result.current.open).toBe(false);
  });
});
