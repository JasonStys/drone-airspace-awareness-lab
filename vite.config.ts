/** @file Jason Stys: static build and helper coverage gates; lines: docs/SOURCE_MAP.md. */
import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
const version = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).version as string;
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  root: "ui",
  build: { outDir: "../dist", emptyOutDir: true },
  test: {
    include: ["src/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/math.ts", "src/labels.ts"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
