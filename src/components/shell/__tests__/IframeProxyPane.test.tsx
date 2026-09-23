import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IframeProxyPane } from "../IframeProxyPane";
import type { Membership, ModuleSummary } from "@/lib/api/types";

const activeWorkspace: Membership = { workspace: "acme-analytics", role: "editor" };
vi.mock("@/lib/session", () => ({ useSession: () => ({ activeWorkspace }) }));

const getIframeUrl = vi.fn();
vi.mock("@/lib/api/client", () => ({ getIframeUrl: (...args: unknown[]) => getIframeUrl(...args) }));

const mod: ModuleSummary = { id: "notebooks", displayName: "Notebooks", version: "0.1.0", hasOwnUi: true };

// 10 minutes — matches IframeProxyPane.tsx's RENEWAL_INTERVAL_MS, comfortably under
// core's 15-minute CookieTTL (booth-core's internal/gateway/iframeproxy.go).
const RENEWAL_INTERVAL_MS = 10 * 60 * 1000;

// vi.useFakeTimers() also mocks the timers @testing-library's waitFor/findBy* rely on
// for their own internal polling, which then never advances and hangs — so this suite
// flushes pending microtasks explicitly (an empty async act) and queries synchronously
// instead, rather than using waitFor/findBy* anywhere below.
const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  getIframeUrl.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("IframeProxyPane session renewal (ADR 0069 item C)", () => {
  it("renews before core's cookie TTL lapses, without reloading the mounted iframe", async () => {
    let call = 0;
    getIframeUrl.mockImplementation(() => Promise.resolve(`https://shell.example/iframe/notebooks/?t=tok-${++call}`));

    render(<IframeProxyPane module={mod} />);
    await flush();
    expect(getIframeUrl).toHaveBeenCalledTimes(1);

    const iframe = screen.getByTitle("Notebooks");
    expect(iframe).toHaveAttribute("src", "https://shell.example/iframe/notebooks/?t=tok-1");
    expect(fetch).not.toHaveBeenCalled();

    // First renewal tick: a fresh URL is requested and quietly fetched — the visible
    // iframe's src must not change to it.
    await act(async () => vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS));
    expect(getIframeUrl).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("https://shell.example/iframe/notebooks/?t=tok-2", {
      credentials: "same-origin",
    });
    expect(iframe).toHaveAttribute("src", "https://shell.example/iframe/notebooks/?t=tok-1");

    // Second tick, same pattern — this is periodic, not a one-shot.
    await act(async () => vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS));
    expect(getIframeUrl).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("a failed renewal doesn't surface an error or unmount the iframe", async () => {
    getIframeUrl.mockResolvedValueOnce("https://shell.example/iframe/notebooks/?t=tok-1");
    render(<IframeProxyPane module={mod} />);
    await flush();
    expect(screen.getByTitle("Notebooks")).toBeInTheDocument();

    getIframeUrl.mockRejectedValueOnce(new Error("core unreachable"));
    await act(async () => vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS));

    expect(screen.getByTitle("Notebooks")).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load/)).toBeNull();
  });

  it("stops renewing once unmounted", async () => {
    getIframeUrl.mockImplementation(() => Promise.resolve("https://shell.example/iframe/notebooks/?t=tok"));
    const { unmount } = render(<IframeProxyPane module={mod} />);
    await flush();
    expect(getIframeUrl).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS * 2));
    expect(getIframeUrl).toHaveBeenCalledTimes(1);
  });

  it("restarts the renewal cycle when the module changes", async () => {
    getIframeUrl.mockImplementation((id: string) => Promise.resolve(`https://shell.example/iframe/${id}/?t=tok`));
    const { rerender } = render(<IframeProxyPane module={mod} />);
    await flush();
    expect(getIframeUrl).toHaveBeenCalledTimes(1);

    const otherModule: ModuleSummary = { id: "superset", displayName: "Superset", version: "0.1.0", hasOwnUi: true };
    rerender(<IframeProxyPane module={otherModule} />);
    await flush();
    expect(getIframeUrl).toHaveBeenCalledTimes(2);
    expect(screen.getByTitle("Superset")).toBeInTheDocument();

    // The old module's timer must be gone — only one more tick's worth of calls, for
    // the new module, not two.
    await act(async () => vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS));
    expect(getIframeUrl).toHaveBeenCalledTimes(3);
  });
});
