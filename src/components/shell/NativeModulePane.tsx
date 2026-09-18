import type { ModuleSummary } from "@/lib/api/types";
import { getNativeModule } from "@/lib/nativeModules";

/**
 * contracts/ui-integration.md's `native` mode content pane. Renders whatever's
 * registered for this module id (see src/lib/nativeModules.ts for the mount-point
 * mechanism and the open question about how it gets populated); falls back to a
 * reserved-slot placeholder when nothing is registered yet, rather than a blank pane.
 */
export function NativeModulePane({ module }: { module: ModuleSummary }) {
  const Component = getNativeModule(module.id);

  if (Component) {
    return <Component />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <h2 className="text-[15px] font-semibold text-text">{module.displayName}</h2>
      <p className="max-w-sm text-[13.5px] text-text-muted">
        This module's screens aren't wired into the shell yet.
      </p>
    </div>
  );
}
