import { Link } from "react-router-dom";
import { useSession } from "@/lib/session";

export function HomePage() {
  const { identity, activeWorkspace } = useSession();

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <h1 className="text-[26px] font-bold tracking-tight text-text">
        {activeWorkspace ? `Welcome to ${activeWorkspace.workspace}` : "Welcome to Project Booth"}
      </h1>
      <p className="mt-2 text-[14.5px] text-text-muted">
        {identity ? `Signed in as ${identity.email}.` : "Here's where you left off."}
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          to="/store"
          className="rounded-md border border-border bg-bg-elevated px-4 py-2.5 text-[13.5px] font-semibold text-text hover:bg-bg-sunken"
        >
          Module Store
        </Link>
      </div>
    </div>
  );
}
