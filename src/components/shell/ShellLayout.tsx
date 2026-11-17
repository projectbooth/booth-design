import { Outlet } from "react-router-dom";
import { MobileNav } from "@/components/nav/MobileNav";
import { NavRail } from "@/components/nav/NavRail";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * Fixed shell layout (contracts/ui-integration.md): nav chrome + main content pane.
 * Owned entirely by booth-design, not per-module configurable. Below docs/mobile.md's
 * `desktop` breakpoint, the nav rail becomes MobileNav's top bar + off-canvas drawer
 * and the layout stacks instead of running side-by-side; above it, this is exactly the
 * rail-beside-content layout this shell has always had (useIsDesktop.ts).
 */
export function ShellLayout() {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="flex h-dvh w-screen overflow-hidden bg-bg text-text">
        <NavRail />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-bg text-text">
      <MobileNav />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
