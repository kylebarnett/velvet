import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests require test accounts in Supabase. Set these env vars:
 *
 *   E2E_INVESTOR_EMAIL / E2E_INVESTOR_PASSWORD
 *   E2E_FOUNDER_EMAIL  / E2E_FOUNDER_PASSWORD
 *
 * The dev server must be running on port 3001.
 */
export default defineConfig({
  testDir: "src/test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Auth setup — runs first and saves storage state
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    // All E2E specs depend on auth setup
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["auth-setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
  },
});
