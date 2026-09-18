import { Outlet } from "react-router-dom";
import { NavRail } from "@/components/nav/NavRail";

/** Fixed shell layout (contracts/ui-integration.md): persistent nav rail + main
 *  content pane. Owned entirely by booth-design, not per-module configurable. */
export function ShellLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      <NavRail />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
