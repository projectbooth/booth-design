import { useEffect, useState } from "react";

// `(hover: hover)` is true for a mouse/trackpad, false for a touchscreen with no
// pointing device — a capability check, not a viewport-width one (a touch laptop
// above the `desktop` breakpoint still has no hover, and should still get tap
// behavior; see useIsDesktop.ts for the separate, width-based check).
const QUERY = "(hover: hover)";

function readMatches(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Whether the current input can hover — docs/mobile.md's reason HelpHint switches
 * from Radix Tooltip's default hover/focus trigger to an explicit tap-to-toggle one:
 * hover doesn't exist on touch, and on iOS Safari specifically a `<button>` tap
 * doesn't even focus it, so neither of Tooltip's two normal triggers fires at all.
 */
export function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(readMatches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setHasHover(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return hasHover;
}
