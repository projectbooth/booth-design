import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { NavRailContent } from "./NavRailContent";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

export interface MobileNavProps {
  /** Opens the drawer immediately on mount instead of waiting for the hamburger tap —
   *  same seam as HelpHint's `defaultOpen` (src/components/ui/HelpHint.tsx): a real
   *  Radix capability, and what tests use instead of simulating a tap on the trigger
   *  (this repo's Radix components hang in CI when a test drives them open that way). */
  defaultOpen?: boolean;
}

/**
 * docs/mobile.md's off-canvas nav: a slim top bar (menu button + wordmark) and a
 * drawer holding the exact same NavRailContent the desktop rail renders (workspace/
 * project switchers included, per the brief). ShellLayout only ever mounts this or
 * NavRail, never both, so there's no desktop-breakpoint styling to apply here — this
 * component simply doesn't exist above that breakpoint. Closed by default; closes on
 * route change and on Esc/outside-tap, both of which Radix Dialog already gives this
 * for free, along with the focus trap while open.
 */
export function MobileNav({ defaultOpen = false }: MobileNavProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Only an actual route change should close the drawer — this effect's own mount
    // run must not immediately undo `defaultOpen` (the test seam HelpHint also uses).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOpen(false);
  }, [pathname]);

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <div
        className="flex h-12 shrink-0 items-center gap-1 border-b border-border-subtle bg-nav-bg px-1 text-text"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <RadixDialog.Trigger asChild>
          <button
            type="button"
            aria-label="Open navigation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text outline-none hover:bg-bg-elevated focus-visible:ring-2"
          >
            <MenuIcon />
          </button>
        </RadixDialog.Trigger>
        <span className="truncate text-[13.5px] font-bold tracking-tight">Project Booth</span>
      </div>

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-bg-overlay" />
        <RadixDialog.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,320px)] flex-col bg-nav-bg text-text"
          style={{ height: "100dvh" }}
        >
          <VisuallyHidden.Root asChild>
            <RadixDialog.Title>Navigation</RadixDialog.Title>
          </VisuallyHidden.Root>
          <div
            className="flex shrink-0 items-center justify-end px-2"
            style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
          >
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close navigation"
                className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted outline-none hover:bg-bg-elevated hover:text-text focus-visible:ring-2"
              >
                <CloseIcon />
              </button>
            </RadixDialog.Close>
          </div>
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
          >
            <NavRailContent />
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
