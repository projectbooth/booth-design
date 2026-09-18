import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-text">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
