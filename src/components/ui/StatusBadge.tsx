import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-bg-sunken text-text-muted",
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning",
        danger: "bg-danger-muted text-danger",
        info: "bg-info-muted text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Renders a small status dot before the label — the common case for health/phase. */
  dot?: boolean;
}

export function StatusBadge({ className, tone, dot, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Maps a BoothModule's status.phase (contracts/module-manifest.md's healthCheckPath
 *  target reports this) to a StatusBadge tone. Unknown phases fall back to neutral
 *  rather than guessing a color. */
export function moduleStatusTone(phase: string | undefined): VariantProps<typeof statusBadgeVariants>["tone"] {
  switch (phase) {
    case "Ready":
    case "Healthy":
      return "success";
    case "Degraded":
      return "warning";
    case "Failed":
    case "Unhealthy":
      return "danger";
    case "Installing":
    case "Pending":
      return "info";
    default:
      return "neutral";
  }
}
