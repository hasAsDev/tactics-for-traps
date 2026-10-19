import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Phaser chạm window ngay khi import → chỉ được import trong src/game/phaser,
    // và nơi khác chỉ được import động (GameView). Import kiểu (type-only) thì được.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/game/phaser/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phaser",
              message: "Chỉ import Phaser trong src/game/phaser (client-only).",
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ["@/game/phaser/*"],
              message: "Chỉ import động module Phaser (await import(...)) trong GameView.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
