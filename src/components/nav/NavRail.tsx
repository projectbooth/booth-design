import { NavButton } from "./NavButton";
import { NavSection } from "./NavSection";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { BuildIcon, HomeIcon, ManageIcon, SettingsIcon, StoreIcon, ViewIcon } from "@/components/ui/icons";
import { groupModulesByNav } from "@/lib/manifest";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { useModules } from "@/lib/useModules";

/**
 * The persistent nav rail (ADR 0005: "never re-renders on navigation"). Below Home and
 * the workspace switcher: Module Store's reserved slot, then Build/View/Manage
 * (ADR 0017), then Settings + the signed-in user, exactly the layout order fixed in
 * this repo's brief.
 */
export function NavRail() {
  const { modules } = useModules();
  const { identity } = useSession();
  const { theme, toggleTheme } = useTheme();
  const grouped = groupModulesByNav(modules);

  if (grouped.unplaced.length > 0 && import.meta.env.DEV) {
    // ADR 0017: "a module that doesn't cleanly fit one of the three groups is a signal
    // worth surfacing to the coordinator rather than guessing" — surfaced here as a
    // dev-time console warning rather than silently dropped or guessed into a group.
    console.warn(
      "[booth-design] modules with hasOwnUi but missing/unrecognized navGroup:",
      grouped.unplaced.map((m) => m.id),
    );
  }

  return (
    <nav className="flex h-full w-nav min-w-nav shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border-subtle bg-nav-bg px-3 py-4 text-text">
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="h-[26px] w-[26px] shrink-0 rounded-md bg-accent" />
        <span className="text-[13.5px] font-bold tracking-tight">Project Booth</span>
      </div>

      <WorkspaceSwitcher />

      <NavButton to="/" icon={<HomeIcon />}>
        Home
      </NavButton>
      <div className="mb-1" />
      <NavButton to="/store" icon={<StoreIcon />}>
        Module Store
      </NavButton>

      <NavSection label="Build" modules={grouped.build} icon={<BuildIcon width={14} height={14} />} />
      <NavSection label="View" modules={grouped.view} icon={<ViewIcon width={14} height={14} />} />
      <NavSection label="Manage" modules={grouped.manage} icon={<ManageIcon width={14} height={14} />} />

      <div className="mt-auto flex flex-col gap-1 border-t border-border-subtle pt-3">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-text-muted hover:bg-bg-elevated hover:text-text"
        >
          <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
          {theme === "dark" ? "Dark mode" : "Light mode"}
        </button>
        <NavButton to="/settings" icon={<SettingsIcon />}>
          Settings
        </NavButton>
        {identity && (
          <div className="mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5">
            <Avatar label={identity.email} />
            <span className="truncate text-[13px] font-semibold text-text">{identity.email}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
