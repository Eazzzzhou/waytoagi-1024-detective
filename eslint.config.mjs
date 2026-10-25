import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ["src/app/**/*.{ts,tsx}"], plugins: { "@next/next": nextPlugin }, rules: { ...nextPlugin.configs.recommended.rules, ...nextPlugin.configs["core-web-vitals"].rules } },
  globalIgnores(["backend/**", ".next/**", "src/generated/**", "next-env.d.ts", ".cache/**", ".taste-skill/**", ".agents/**", ".codex/**", "docs/reference/**"]),
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/server/**", "**/server/**", "@/worker/**", "**/worker/**", "@/generated/**", "**/generated/**", "@prisma/**", "pg", "node:*"], message: "UI components must use HTTP contracts and must not access server modules or database clients." }] }]
    }
  },
  {
    files: ["src/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["next", "next/**", "@prisma/**", "pg", "node:*", "@/server/**", "**/server/**", "**/generated/**", "**/worker/**"], message: "Contracts must remain portable between browser, Web and Worker." }] }]
    }
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/worker/**", "**/worker/**"], message: "Web must not import the Worker entry point." }] }]
    }
  },
  {
    files: ["src/server/**/*.ts", "src/worker/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["next", "next/**", "server-only", "@/app/**", "**/app/**"], message: "Shared server and Worker modules must be independent of Next request runtime." }] }]
    }
  }
]);
