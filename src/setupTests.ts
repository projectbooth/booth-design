import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver; @radix-ui/react-use-size (Tooltip's Arrow, and anything
// else sizing itself off an element) calls it unconditionally on mount.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no matchMedia either; useIsDesktop (docs/mobile.md) calls it unconditionally
// on mount. Defaults to "not desktop" so a test that doesn't care gets the simpler of
// the two nav chromes; a test that does care overrides window.matchMedia itself.
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
