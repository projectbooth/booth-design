import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

export interface NavButtonProps {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  indent?: boolean;
  /** Match `to` exactly rather than as a prefix — needed when another entry's path
   *  nests beneath this one's (a module's adminNavPath under its navPath). */
  end?: boolean;
}

export function NavButton({ to, icon, children, indent, end }: NavButtonProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors",
          indent && "pl-5",
          isActive ? "bg-accent-muted text-accent" : "text-text-muted hover:bg-bg-elevated hover:text-text",
        )
      }
    >
      <span className="flex shrink-0 items-center">{icon}</span>
      <span className="truncate">{children}</span>
    </NavLink>
  );
}
