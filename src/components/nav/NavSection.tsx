import type { ReactNode } from "react";
import type { ModuleSummary } from "@/lib/api/types";
import { NavButton } from "./NavButton";
import { FallbackModuleIcon, SettingsIcon } from "@/components/ui/icons";

export interface NavSectionProps {
  label: string;
  modules: ModuleSummary[];
  icon: ReactNode;
  /** Whether the caller holds the owner role in the active workspace — gates the
   *  per-module admin entries (ADR 0023). */
  isOwner?: boolean;
}

/** One of the shell rail's three fixed groups (ADR 0017): a section header plus each
 *  installed module whose navGroup matches, in module-icon-chip style per the
 *  wireframe (a small square carrying the module's first two initials). A module that
 *  declares `adminNavPath` gets an indented "<name> admin" entry beneath it, owners only. */
export function NavSection({ label, modules, icon, isOwner = false }: NavSectionProps) {
  if (modules.length === 0) return null;
  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 px-2 pb-1.5 pt-3.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
        {icon}
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        {modules.map((m) => {
          const navPath = m.navPath ?? `/${m.id}`;
          // booth-core already withholds adminNavPath from non-owners (server side);
          // checking role here too keeps the shell correct on its own.
          const adminPath = isOwner ? m.adminNavPath : undefined;
          const adminNestedUnderNav = adminPath?.startsWith(`${navPath}/`) ?? false;
          return (
            <div key={m.id} className="flex flex-col gap-0.5">
              <NavButton to={navPath} icon={<ModuleChip module={m} />} end={adminNestedUnderNav}>
                {m.displayName}
              </NavButton>
              {adminPath && (
                <NavButton to={adminPath} icon={<SettingsIcon width={14} height={14} />} indent>
                  {m.displayName} admin
                </NavButton>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleChip({ module }: { module: ModuleSummary }) {
  const initials = module.displayName.slice(0, 2).toUpperCase();
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-bg-sunken font-mono text-[9px] font-bold text-current">
      {initials || <FallbackModuleIcon width={12} height={12} />}
    </span>
  );
}
