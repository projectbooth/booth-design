import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS, useModules } from "../useModules";
import type { Membership, ModuleSummary } from "../api/types";

// ARCHITECTURE.md item 70: the nav rail must catch up with an installed/removed module
// within 30s, not only on a full browser reload. These tests exercise the hook in
// isolation (not through NavRail) so they don't depend on groupModulesByNav's own
// sorting/grouping.

const activeWorkspace: Membership = { workspace: "acme-analytics", role: "editor" };
vi.mock("../session", () => ({ useSession: () => ({ activeWorkspace }) }));

const listModules = vi.fn();
vi.mock("../api/client", () => ({ listModules: (...args: unknown[]) => listModules(...args) }));

function mod(overrides: Partial<ModuleSummary>): ModuleSummary {
  return { id: "mod", displayName: "Mod", version: "0.1.0", hasOwnUi: true, ...overrides };
}

// vi.useFakeTimers() also mocks the timers @testing-library's waitFor/findBy* rely on,
// so this suite flushes pending microtasks explicitly (an empty async act) instead,
// mirroring IframeProxyPane.test.tsx's own fake-timer convention.
const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  listModules.mockReset();
  // jsdom's default is "visible"; pin it explicitly since a prior test in this file may
  // have shadowed the property with document.defineProperty.
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useModules background polling", () => {
  it("picks up a newly installed module after 30s, with no loading flash", async () => {
    const storage = mod({ id: "storage", displayName: "Storage" });
    listModules.mockResolvedValueOnce([storage]);
    const { result } = renderHook(() => useModules());
    await flush();
    expect(result.current.modules).toEqual([storage]);
    expect(result.current.loading).toBe(false);

    const catalog = mod({ id: "catalog", displayName: "Catalog" });
    listModules.mockResolvedValueOnce([storage, catalog]);
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(result.current.modules).toEqual([storage, catalog]);
    // The background poll never toggled loading back to true -- no flash.
    expect(result.current.loading).toBe(false);
  });

  it("does not poll while the tab is hidden", async () => {
    listModules.mockResolvedValue([mod({ id: "storage" })]);
    renderHook(() => useModules());
    await flush();
    expect(listModules).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(listModules).toHaveBeenCalledTimes(1);
  });

  it("refetches immediately on regaining focus, not just on the next interval tick", async () => {
    listModules.mockResolvedValue([mod({ id: "storage" })]);
    renderHook(() => useModules());
    await flush();
    expect(listModules).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    expect(listModules).toHaveBeenCalledTimes(2);
  });

  it("refetches immediately when the tab becomes visible again", async () => {
    listModules.mockResolvedValue([mod({ id: "storage" })]);
    renderHook(() => useModules());
    await flush();
    expect(listModules).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(listModules).toHaveBeenCalledTimes(2);
  });

  it("a failing background refetch keeps the last good list and surfaces no error", async () => {
    const storage = mod({ id: "storage" });
    listModules.mockResolvedValueOnce([storage]);
    const { result } = renderHook(() => useModules());
    await flush();
    expect(result.current.modules).toEqual([storage]);

    listModules.mockRejectedValueOnce(new Error("network blip"));
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(result.current.modules).toEqual([storage]);
    expect(result.current.error).toBeNull();
  });

  it("an identical list on refetch does not replace the array reference", async () => {
    const storage = mod({ id: "storage" });
    listModules.mockResolvedValueOnce([storage]);
    const { result } = renderHook(() => useModules());
    await flush();
    const first = result.current.modules;

    // A fresh array/object instance with the same id/displayName/phase/navPath/
    // adminNavPath -- a different reference, identical observable content.
    listModules.mockResolvedValueOnce([{ ...storage }]);
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(result.current.modules).toBe(first);
  });

  it("treats a changed status/navPath as a real change even with the same id/displayName", async () => {
    const installing = mod({ id: "storage", displayName: "Storage", phase: "Installing" });
    listModules.mockResolvedValueOnce([installing]);
    const { result } = renderHook(() => useModules());
    await flush();

    const ready = { ...installing, phase: "Ready" };
    listModules.mockResolvedValueOnce([ready]);
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(result.current.modules).toEqual([ready]);
  });

  it("stops polling once unmounted", async () => {
    listModules.mockResolvedValue([mod({ id: "storage" })]);
    const { unmount } = renderHook(() => useModules());
    await flush();
    expect(listModules).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(listModules).toHaveBeenCalledTimes(1);
  });
});
