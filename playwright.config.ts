/** @file Jason Stys: real Python/Rust service browser acceptance, no mocks/retries; lines: docs/SOURCE_MAP.md. */
import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
const localPython =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const python =
  process.env.PYTHON ?? (existsSync(localPython) ? localPython : "python");
export default defineConfig({
  testDir: "tests/browser",
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8872", trace: "off" },
  webServer: {
    command: `"${python}" -m awareness --port 8872`,
    url: "http://127.0.0.1:8872",
    reuseExistingServer: false,
    timeout: 20000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
