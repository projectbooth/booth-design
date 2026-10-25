import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpHint } from "../HelpHint";
import { TooltipProvider } from "../Tooltip";

// Defensive: another test file in this run may leave fake timers active (vitest's
// isolation doesn't always undo this across files in the same worker when running in
// parallel), which hangs Radix's internal open-delay setTimeout and @testing-library's
// own waitFor/findBy* polling forever — both rely on real timers advancing. Mirrors
// IframeProxyPane.test.tsx/useModules.test.ts's own documented convention: flush with
// a real, bounded wait instead of waitFor/findBy*'s unbounded timer-based polling.
beforeEach(() => {
  vi.useRealTimers();
});

const flushOpenDelay = () => act(() => new Promise((r) => setTimeout(r, 10)));

function renderHint(props: Parameters<typeof HelpHint>[0]) {
  return render(
    <TooltipProvider delayDuration={0}>
      <HelpHint {...props} />
    </TooltipProvider>,
  );
}

describe("HelpHint", () => {
  it("names the trigger with the label by default", () => {
    renderHint({ label: "Shows tables this API can write to." });
    expect(screen.getByRole("button", { name: "Shows tables this API can write to." })).toBeInTheDocument();
  });

  it("prefers an explicit ariaLabel over the tooltip text", () => {
    renderHint({ label: "Role capped at editor.", ariaLabel: "Role help" });
    expect(screen.getByRole("button", { name: "Role help" })).toBeInTheDocument();
  });

  it(
    "shows the label text in a tooltip on hover",
    async () => {
      renderHint({ label: "Disabled accounts refuse the next mint." });
      const user = userEvent.setup({ delay: null });
      expect(screen.queryByText("Disabled accounts refuse the next mint.")).not.toBeInTheDocument();
      await user.hover(screen.getByRole("button"));
      await flushOpenDelay();
      expect(screen.getByText("Disabled accounts refuse the next mint.")).toBeInTheDocument();
    },
    // Mounting a Radix portal + popper under a full parallel test run can be slow under
    // CPU contention from the other worker threads — generous on purpose, not masking a
    // hang (this resolves in well under 100ms in isolation).
    20_000,
  );

  it(
    "shows the tooltip on keyboard focus, not just hover",
    async () => {
      renderHint({ label: "Reachable from pretty much everywhere." });
      const button = screen.getByRole("button");
      // Focuses the trigger directly rather than via user.tab(), which walks the whole
      // document's tab order from document.activeElement — fragile under a full test run
      // sharing one jsdom document across files. A native <button> is focusable by
      // default; what this test actually cares about is Radix showing the tooltip on
      // focus, not re-proving browser tab order.
      act(() => button.focus());
      expect(button).toHaveFocus();
      await flushOpenDelay();
      expect(screen.getByText("Reachable from pretty much everywhere.")).toBeInTheDocument();
    },
    20_000,
  );
});
