import { NavButton } from "./NavButton";
import { NavSection } from "./NavSection";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { BuildIcon, HomeIcon, ManageIcon, SettingsIcon, StoreIcon, ViewIcon } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { logout } from "@/lib/auth/authClient";
import { isProjectsEnabled } from "@/lib/featureFlags";
import { groupModulesByNav } from "@/lib/manifest";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { useModules } from "@/lib/useModules";

/**
 * The nav's actual content — everything NavRail (the fixed desktop rail) and
 * MobileNav (the off-canvas drawer, docs/mobile.md) both render verbatim, so the
 * workspace/project switchers and the module groups exist exactly once and stay in
 * sync between the two chromes rather than being two copies that can drift.
 */
export function NavRailContent() {
  const { modules } = useModules();
  const { identity, activeWorkspace } = useSession();
  const isOwner = activeWorkspace?.role === "owner";
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
    <>
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="h-[26px] w-[26px] shrink-0 rounded-md bg-accent" />
        <span className="text-[13.5px] font-bold tracking-tight">Project Booth</span>
      </div>

      <WorkspaceSwitcher />
      {isProjectsEnabled() && <ProjectSwitcher />}

      <NavButton to="/" icon={<HomeIcon />}>
        Home
      </NavButton>
      <div className="mb-1" />
      <NavButton to="/store" icon={<StoreIcon />}>
        Module Store
      </NavButton>

      <NavSection label="Build" modules={grouped.build} isOwner={isOwner} icon={<BuildIcon width={14} height={14} />} />
      <NavSection label="View" modules={grouped.view} isOwner={isOwner} icon={<ViewIcon width={14} height={14} />} />
      <NavSection label="Manage" modules={grouped.manage} isOwner={isOwner} icon={<ManageIcon width={14} height={14} />} />

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left outline-none hover:bg-bg-elevated focus-visible:ring-2">
                <Avatar label={identity.email} />
                <span className="truncate text-[13px] font-semibold text-text">{identity.email}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(var(--nav-width)-24px)]" align="end">
              <DropdownMenuItem onSelect={() => void logout()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  );
}
