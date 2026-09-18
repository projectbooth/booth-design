import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled, id, ...aria }: SwitchProps) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-border-subtle bg-bg-sunken outline-none transition-colors focus-visible:ring-2 data-[state=checked]:bg-accent data-[state=checked]:border-accent",
      )}
      {...aria}
    >
      <RadixSwitch.Thumb className="block h-[18px] w-[18px] translate-x-0.5 rounded-full bg-bg-elevated shadow transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-text-on-accent" />
    </RadixSwitch.Root>
  );
}
