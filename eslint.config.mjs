import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Desactiva reglas de estilo que chocan con Prettier.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototipo de referencia (React UMD global), no es código de la app.
    "references/**",
    // Capturas y scripts temporales de Playwright MCP (ya ignorados en .gitignore).
    ".playwright-mcp/**",
  ]),
]);

export default eslintConfig;
