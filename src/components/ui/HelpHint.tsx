import { HelpCircleIcon } from "./icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { cn } from "@/lib/cn";
import { useHasHover } from "@/lib/useHasHover";
import { useTapToOpen } from "@/lib/useTapToOpen";

export interface HelpHintProps {
  /** Short, plain-language explanation shown in the tooltip. Keep it to a sentence or
   *  two — this is a hint, not documentation. */
  label: string;
  /** Screen-reader name for the hint button itself, when `label` alone wouldn't make
   *  sense out of context (e.g. several hints on one row). Defaults to `label`. */
  ariaLabel?: string;
  /** Opens the tooltip immediately on mount instead of waiting for hover/focus/tap — a
   *  real Radix capability on a hover-capable device (e.g. drawing attention to a hint
   *  during onboarding), and also what tests use to check the rendered content without
   *  simulating hover/focus/tap timing. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * The shell's one "?" affordance — for labels, table column headers, and status chips.
 * On a hover-capable device, shows `label` on hover or keyboard focus exactly as
 * before: Radix wires `aria-describedby` and Escape-to-dismiss, no custom keyboard
 * handling needed. On a device with no hover (docs/mobile.md: `useHasHover`), neither
 * of those two triggers reliably fires at all — a touchscreen has no hover, and iOS
 * Safari specifically doesn't even focus a `<button>` on tap — so this instead makes
 * the tooltip controlled via `useTapToOpen` and opens/closes it on tap of the trigger
 * itself, closing on a tap anywhere else since there's no hover-out to fall back on
 * either. Requires a `TooltipProvider` higher in the tree (mounted once in App.tsx).
 */
export function HelpHint({ label, ariaLabel, defaultOpen, className }: HelpHintProps) {
  const hasHover = useHasHover();
  const { open, setOpen, toggle, containerRef } = useTapToOpen<HTMLSpanElement>(defaultOpen ?? false);

  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={hasHover ? undefined : toggle}
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-text-muted outline-none hover:text-text focus-visible:ring-2",
        className,
      )}
    >
      <HelpCircleIcon width={14} height={14} />
    </button>
  );

  if (hasHover) {
    return (
      <Tooltip defaultOpen={defaultOpen}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span ref={containerRef} className="contents">
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </span>
  );
}
