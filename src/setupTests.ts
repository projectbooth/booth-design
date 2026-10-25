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
