/** @file Jason Stys: static build and helper coverage gates; lines: docs/SOURCE_MAP.md. */
import { defineConfig } from "vitest/config";
export default defineConfig({
  root: "ui",
  build: { outDir: "../dist", emptyOutDir: true },
  test: {
    include: ["src/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/math.ts"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
