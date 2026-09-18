import type { ReactNode } from "react";
import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({
  children,
  className,
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-[220px] overflow-hidden rounded-md border border-border bg-bg-elevated p-1 shadow-lg",
          className,
        )}
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  className,
}: {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] text-text outline-none data-[highlighted]:bg-bg-sunken",
        className,
      )}
    >
      {children}
    </RadixDropdown.Item>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <RadixDropdown.Separator className="my-1 h-px bg-border" />;
}
