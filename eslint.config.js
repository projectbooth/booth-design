import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // qa-investigation is throwaway investigation tooling for the dark-mode cascade bug
  // (not shipped, not for merge as-is) -- Node scripts, not app source.
  { ignores: ["dist", "public", "qa-investigation"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
);
