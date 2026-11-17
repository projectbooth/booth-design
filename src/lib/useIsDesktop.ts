import { useEffect, useState } from "react";

// docs/mobile.md's `desktop` breakpoint: strictly above the tablet-portrait width
// (768px) the mobile brief still wants drawer nav on, which is why this isn't
// Tailwind's own `md:` (min-width: 768px).
const QUERY = "(min-width: 769px)";

function readMatches(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Whether the viewport is at docs/mobile.md's `desktop` breakpoint or above. Drives
 * which nav chrome ShellLayout mounts (NavRail vs. MobileNav) as a single JS decision
 * — see NavRail.tsx's own comment for why this isn't instead "mount both, hide one
 * with CSS."
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(readMatches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
