import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpHint } from "../HelpHint";
import { TooltipProvider } from "../Tooltip";

let hasHover = true;
vi.mock("@/lib/useHasHover", () => ({ useHasHover: () => hasHover }));

function renderHint(props: Parameters<typeof HelpHint>[0]) {
  return render(
    <TooltipProvider>
      <HelpHint {...props} />
    </TooltipProvider>,
  );
}

describe("HelpHint", () => {
  beforeEach(() => {
    hasHover = true;
  });

  it("names the trigger with the label by default", () => {
    renderHint({ label: "Shows tables this API can write to." });
    expect(screen.getByRole("button", { name: "Shows tables this API can write to." })).toBeInTheDocument();
  });

  it("prefers an explicit ariaLabel over the tooltip text", () => {
    renderHint({ label: "Role capped at editor.", ariaLabel: "Role help" });
    expect(screen.getByRole("button", { name: "Role help" })).toBeInTheDocument();
  });

  it("is closed by default", () => {
    renderHint({ label: "Disabled accounts refuse the next mint." });
    expect(screen.queryByText("Disabled accounts refuse the next mint.")).not.toBeInTheDocument();
  });

  // Whether hover/focus actually opens it is Radix's own well-tested behavior, not
  // something HelpHint implements — simulating that timing reliably in jsdom is the
  // library's test surface, not ours. `defaultOpen` (a real Radix capability, forwarded
  // by HelpHint) checks what *is* ours: that the label text actually reaches
  // TooltipContent, without depending on hover/focus-intent timers at all.
  it("renders the label text as the tooltip content", () => {
    renderHint({ label: "Reachable from pretty much everywhere.", defaultOpen: true });
    expect(screen.getByText("Reachable from pretty much everywhere.")).toBeInTheDocument();
  });

  // docs/mobile.md: on a device with no hover, HelpHint switches to useTapToOpen
  // instead of Radix's default hover/focus trigger. That hook's own toggle/outside-tap
  // logic is covered on its own (src/lib/__tests__/useTapToOpen.test.ts) without ever
  // mounting a live Tooltip — driving a mounted Radix Tooltip through a real open/close
  // transition hangs under this project's CI regardless of what triggers it, simulated
  // hover included (see HelpHint/ProjectSwitcher's own test comments). This only
  // checks that the no-hover branch still renders correctly at mount via `defaultOpen`.
  it("still honors defaultOpen with no hover", () => {
    hasHover = false;
    renderHint({ label: "Visible without any hover at all.", defaultOpen: true });
    expect(screen.getByText("Visible without any hover at all.")).toBeInTheDocument();
  });

  it("is still closed by default with no hover", () => {
    hasHover = false;
    renderHint({ label: "Not shown until tapped." });
    expect(screen.queryByText("Not shown until tapped.")).not.toBeInTheDocument();
  });
});
