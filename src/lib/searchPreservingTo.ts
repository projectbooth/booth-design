import { useLocation } from "react-router-dom";

/**
 * ADR 0124: `?project=<slug>` (and any other current query string) must survive
 * navigating between the shell's own routes — a bare `to="/path"` on `<Link>`/`<NavLink>`
 * drops the current search string entirely, since react-router never merges it in
 * automatically. Every shell-owned navigation link should build its `to` through this,
 * not a plain string, so a future link doesn't silently reintroduce the same gap.
 */
export function useSearchPreservingTo(pathname: string): { pathname: string; search: string } {
  const { search } = useLocation();
  return { pathname, search };
}
