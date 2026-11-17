import { NavRailContent } from "./NavRailContent";

/**
 * The persistent desktop nav rail (ADR 0005: "never re-renders on navigation"). Below
 * docs/mobile.md's `desktop` breakpoint, ShellLayout mounts MobileNav instead of this —
 * never both at once, so NavRailContent's data fetches and dropdown state exist exactly
 * once regardless of viewport, matching this same ADR's intent for everything it wraps.
 */
export function NavRail() {
  return (
    <nav className="flex h-full w-nav min-w-nav shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border-subtle bg-nav-bg px-3 py-4 text-text">
      <NavRailContent />
    </nav>
  );
}
