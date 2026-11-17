import { useEffect, useRef, useState } from "react";

/**
 * A controlled open/close state that toggles on its own trigger and closes again on a
 * tap anywhere else — docs/mobile.md's fallback for anything (HelpHint) that normally
 * opens on hover/focus, neither of which reliably fires with no hover (a touchscreen
 * has none at all; iOS Safari specifically doesn't even focus a `<button>` on tap).
 * Pulled out of HelpHint as its own hook so it can be tested without ever rendering a
 * live Radix Tooltip: this project's own experience is that driving a mounted
 * Tooltip/Popper through a real open/close transition — by any input, not just
 * simulated hover — hangs under CI's parallel test run.
 */
export function useTapToOpen<T extends HTMLElement>(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return { open, setOpen, toggle: () => setOpen((o) => !o), containerRef };
}
