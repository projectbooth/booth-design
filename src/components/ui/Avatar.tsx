import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  label: string;
  size?: "sm" | "md";
  className?: string;
}

function initialsFrom(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ label, size = "sm", className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-text-on-accent",
        size === "sm" ? "h-6 w-6 text-[11px]" : "h-11 w-11 text-[15px]",
        className,
      )}
    >
      <RadixAvatar.Fallback>{initialsFrom(label)}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
