import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelpHint } from "../HelpHint";
import { TooltipProvider } from "../Tooltip";

function renderHint(props: Parameters<typeof HelpHint>[0]) {
  return render(
    <TooltipProvider>
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
});
