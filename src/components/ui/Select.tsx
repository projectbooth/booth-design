import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

export function Select({ value, onValueChange, options, placeholder, disabled, ...aria }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-elevated px-3 text-[13.5px] text-text focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50",
        )}
        {...aria}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-text-muted">▾</RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 overflow-hidden rounded-md border border-border bg-bg-elevated shadow-lg"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="cursor-pointer select-none rounded-sm px-3 py-2 text-[13.5px] text-text outline-none data-[highlighted]:bg-bg-sunken data-[state=checked]:text-accent"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
