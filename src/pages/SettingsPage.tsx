import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { logout } from "@/lib/auth/authClient";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";

export function SettingsPage() {
  const { identity, activeWorkspace } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="mb-7 text-[26px] font-bold tracking-tight text-text">Settings</h1>

      {identity && (
        <div className="mb-6 flex items-center gap-4 rounded-lg border border-border p-5">
          <Avatar label={identity.email} size="md" />
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-text">{identity.email}</div>
            <div className="text-[13px] text-text-muted">
              {activeWorkspace ? `${activeWorkspace.role} in ${activeWorkspace.workspace}` : "No active workspace"}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      )}

      <Field label="Appearance" hint="Applies to this browser only." className="mb-6">
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3.5">
          <span className="text-[13px] text-text-muted">{theme === "dark" ? "Dark" : "Light"}</span>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} aria-label="Dark mode" />
        </div>
      </Field>
    </div>
  );
}
