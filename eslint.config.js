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
    // CI tooling (scripts/check-dark-variants.mjs): a Node script whose page.evaluate()
    // callbacks also reference browser globals directly, since they execute inside the
    // Playwright-controlled page, not this process.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        document: "readonly",
        getComputedStyle: "readonly",
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
