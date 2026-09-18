import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { EmptyWorkspacePage } from "@/pages/EmptyWorkspacePage";
import { HomePage } from "@/pages/HomePage";
import { ModuleRoutePage } from "@/pages/ModuleRoutePage";
import { ModuleStorePage } from "@/pages/ModuleStorePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SessionProvider, useSession } from "@/lib/session";
import { AuthGate } from "@/lib/auth/AuthGate";

function Gate() {
  const { identity, loading, error, activeWorkspace } = useSession();

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-bg text-text-muted">Loading…</div>;
  }

  if (error || !identity) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg text-danger">
        Couldn't load your session{error ? `: ${error}` : ""}.
      </div>
    );
  }

  if (!activeWorkspace) {
    return <EmptyWorkspacePage />;
  }

  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/store" element={<ModuleStorePage />} />
        <Route path="*" element={<ModuleRoutePage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    // AuthGate must sit outside BrowserRouter: it resolves the OIDC callback and
    // rewrites the address bar via the raw History API (src/lib/auth/authClient.ts)
    // before BrowserRouter ever reads window.location for its initial route — doing
    // this the other way around risks BrowserRouter's internal history state getting
    // out of sync with a URL rewrite it didn't originate.
    <AuthGate>
      <BrowserRouter>
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </BrowserRouter>
    </AuthGate>
  );
}
