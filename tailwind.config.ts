import type { Config } from "tailwindcss";

// darkMode strategy MUST match booth-module-store's web/tailwind.config.js exactly
// (`data-theme="dark"` attribute, not Tailwind's default `.dark` class or media-query
// strategy) — its native component mounts inside this shell and its own `dark:`
// classes resolve against whatever attribute this config declares.
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  // Also scans every native module's published bundle, not just this shell's own
  // source (ADR 0097): every module ships the same default-theme Tailwind config (no
  // theme.extend/plugins/safelist beyond this repo's own), so compiling their classes
  // through this one build means Tailwind's own base-before-variant ordering guarantee
  // covers all of them together, not just within each module's own separate build --
  // fixes the cross-module cascade bug where a later module's plain `.bg-white` could
  // tie-and-beat an earlier module's `.dark:bg-slate-950` (both specificity (0,1,0),
  // concatenation order decided the winner). See README.md's "Native module UI
  // package obligations" for what this requires of a module UI package.
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
