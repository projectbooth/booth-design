import type { ModuleSummary } from "@/lib/api/types";
import { getNativeModule } from "@/lib/nativeModules";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";

/**
 * contracts/ui-integration.md's `native` mode content pane. Renders whatever's
 * registered for this module id, passing the ADR 0030 prop contract (workspace, role,
 * theme — see src/lib/nativeModules.ts). Falls back to a reserved-slot placeholder
 * when nothing is registered yet, rather than a blank pane or a crash.
 */
export function NativeModulePane({ module }: { module: ModuleSummary }) {
  const Component = getNativeModule(module.id);
  const { activeWorkspace } = useSession();
  const { theme } = useTheme();

  if (Component && activeWorkspace) {
    return <Component workspace={activeWorkspace.workspace} role={activeWorkspace.role} theme={theme} />;
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
