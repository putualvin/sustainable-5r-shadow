import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".next-docs/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Retained only for the paused Azure Windows/IIS workflow.
    "server.js",
  ]),
]);
