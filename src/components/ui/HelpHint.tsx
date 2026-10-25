import { HelpCircleIcon } from "./icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { cn } from "@/lib/cn";

export interface HelpHintProps {
  /** Short, plain-language explanation shown in the tooltip. Keep it to a sentence or
   *  two — this is a hint, not documentation. */
  label: string;
  /** Screen-reader name for the hint button itself, when `label` alone wouldn't make
   *  sense out of context (e.g. several hints on one row). Defaults to `label`. */
  ariaLabel?: string;
  className?: string;
}

/**
 * The shell's one "?" affordance — for labels, table column headers, and status chips.
 * Shows `label` in a tooltip on hover or keyboard focus; Radix wires `aria-describedby`
 * and Escape-to-dismiss, so no custom keyboard handling is needed here. Requires a
 * `TooltipProvider` higher in the tree (mounted once in App.tsx).
 */
export function HelpHint({ label, ariaLabel, className }: HelpHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? label}
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-text-muted outline-none hover:text-text focus-visible:ring-2",
            className,
          )}
        >
          <HelpCircleIcon width={14} height={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
