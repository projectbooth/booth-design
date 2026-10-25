import type { ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export function TooltipContent({
  children,
  className,
  side = "top",
}: {
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        side={side}
        sideOffset={6}
        className={cn(
          "z-50 max-w-xs rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-[12px] text-text shadow-lg",
          className,
        )}
      >
        {children}
        <RadixTooltip.Arrow className="fill-bg-elevated" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
}
