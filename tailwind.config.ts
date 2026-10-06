import type { Config } from "tailwindcss";

// darkMode strategy MUST match booth-module-store's web/tailwind.config.js exactly
// (`data-theme="dark"` attribute, not Tailwind's default `.dark` class or media-query
// strategy) — its native component mounts inside this shell and its own `dark:`
// classes resolve against whatever attribute this config declares.
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  // INVESTIGATION PROTOTYPE (option A, see qa-investigation/REPORT.md) -- scanning each
  // native module's published bundle means every dark:/base pair resolves inside this
  // one Tailwind run, where Tailwind's own ordering guarantee (variants always emitted
  // after base utilities) applies across all of them, not just within one module's own
  // separate build. NOT for merge as-is: this is an ADR question, pending a ruling.
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./node_modules/@projectbooth/*-ui/dist/**/*.js"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-elevated": "var(--color-bg-elevated)",
        "bg-sunken": "var(--color-bg-sunken)",
        "bg-overlay": "var(--color-bg-overlay)",
        "nav-bg": "var(--color-nav-bg)",
        border: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)",
        },
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          "on-accent": "var(--color-text-on-accent)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          strong: "var(--color-accent-strong)",
          muted: "var(--color-accent-muted)",
        },
        danger: { DEFAULT: "var(--color-danger)", muted: "var(--color-danger-muted)" },
        warning: { DEFAULT: "var(--color-warning)", muted: "var(--color-warning-muted)" },
        info: { DEFAULT: "var(--color-info)", muted: "var(--color-info-muted)" },
        success: { DEFAULT: "var(--color-success)", muted: "var(--color-success-muted)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      width: {
        nav: "var(--nav-width)",
      },
      minWidth: {
        nav: "var(--nav-width)",
      },
      ringColor: {
        DEFAULT: "var(--color-focus-ring)",
      },
    },
  },
  plugins: [],
} satisfies Config;
