/** ADR 0025 §5: zero matching membership entries is an authenticated-but-workspace-
 *  less state, not an error — shown instead of the shell's normal routes. */
export function EmptyWorkspacePage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-bg px-6 text-center text-text">
      <h1 className="text-[18px] font-semibold">No workspace yet</h1>
      <p className="max-w-sm text-[13.5px] text-text-muted">
        You're signed in, but not a member of any workspace. Ask a workspace owner to add you.
      </p>
    </div>
  );
}
