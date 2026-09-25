import type { ModuleSummary } from "@/lib/api/types";
import { getNativeModule } from "@/lib/nativeModules";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";

/**
 * contracts/ui-integration.md's `native` mode content pane. Renders whatever's
 * registered for this module id, passing the ADR 0031/0033 prop contract (workspace,
 * role, theme, getAccessToken — see src/lib/nativeModules.ts). `getAccessToken` is
 * tokenStore.ts's function passed straight through by reference, not called here and
 * captured as a value — ADR 0033 requires the mounted component to call it itself,
 * fresh, immediately before each of its own requests, so it never reads a token that's
 * gone stale after a silent refresh. Falls back to a reserved-slot placeholder when
 * nothing is registered yet, rather than a blank pane or a crash.
 *
 * The shell owns outer padding around every native module uniformly (ADR 0072) — a
 * mounted component's own root should assume this padding already exists and never add
 * its own (`p-6` here is `--space-6`, tokens.css). Scoped to this pane only, not
 * `ShellLayout`'s `<main>`: that element also wraps Home, Settings, and
 * `IframeProxyPane`, none of which should get this treatment — Home/Settings already
 * own their own layout, and an iframe-proxied third-party UI needs to stay flush
 * against the pane's edges, not get a shell-owned border around someone else's page.
 */
export function NativeModulePane({ module }: { module: ModuleSummary }) {
  const Component = getNativeModule(module.id);
  const { activeWorkspace } = useSession();
  const { theme } = useTheme();

  if (Component && activeWorkspace) {
    return (
      <div className="h-full p-6">
        <Component
          workspace={activeWorkspace.workspace}
          role={activeWorkspace.role}
          theme={theme}
          getAccessToken={getAccessToken}
        />
      </div>
    );
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
