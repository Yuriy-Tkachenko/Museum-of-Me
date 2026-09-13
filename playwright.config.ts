import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "**/*.spec.ts", fullyParallel: false, workers: 1,
  timeout: 90000, expect: { timeout: 15000 }, retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3100", actionTimeout: 15000, trace: "retain-on-failure", screenshot: "only-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }, { name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "node --require ./tests/e2e/mock-external.cjs node_modules/next/dist/bin/next start -p 3100",
    url: "http://localhost:3100", reuseExistingServer: false, timeout: 60000,
  },
});
