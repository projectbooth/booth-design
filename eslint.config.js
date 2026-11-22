import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "public", "design-ui/dist", "design-ui/src/vendor", "design-ui/node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  {
    // CI tooling (scripts/check-dark-variants.mjs, scripts/mobile-smoke.mjs): a Node
    // script whose page.evaluate()/addInitScript() callbacks also reference browser
    // globals directly, since they execute inside the Playwright-controlled page, not
    // this process. fetch/setTimeout are this process's own (Node 18+'s global fetch,
    // used by mobile-smoke.mjs's dev-server readiness poll).
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        document: "readonly",
        getComputedStyle: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
      },
    },
  },
  {
    // design-ui/scripts/sync-source.mjs: a plain Node script, no browser globals needed.
    files: ["design-ui/scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
      },
    },
  },
);
