import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useSession } from "@/lib/session";

/**
 * Built against ADR 0025's claim shape directly: memberships are `/workspaces/<slug>/
 * <owner|editor|viewer>` entries derived from the token, never a separately-stored
 * membership table — so this switcher only ever lists what `GET /api/me` returns,
 * with no independent "list all workspaces" call.
 */
export function WorkspaceSwitcher() {
  const { identity, activeWorkspace, setActiveWorkspace } = useSession();

  if (!identity) {
    return (
      <div className="mb-4 h-[54px] animate-pulse rounded-lg border border-border-subtle bg-bg-elevated" />
    );
  }

  if (identity.memberships.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-border-subtle bg-bg-elevated px-2.5 py-2 text-[12px] text-text-muted">
        No workspaces yet
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mb-4 flex w-full items-center justify-between rounded-md border border-border bg-bg-elevated px-2.5 py-2 text-left text-text outline-none focus-visible:ring-2">
          <span className="flex min-w-0 flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Workspace
            </span>
            <span className="truncate text-[13px] font-semibold">
              {activeWorkspace?.workspace ?? "—"}
            </span>
          </span>
          <ChevronDownIcon className="shrink-0 text-text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[calc(var(--nav-width)-24px)]">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {identity.memberships.map((m) => (
          <DropdownMenuItem key={m.workspace} onSelect={() => setActiveWorkspace(m.workspace)}>
            <span className="flex-1 truncate">{m.workspace}</span>
            <span className="text-[11px] uppercase text-text-muted">{m.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
