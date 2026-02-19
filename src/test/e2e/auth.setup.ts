import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Auth setup for E2E tests.
 *
 * Logs in as both an investor and a founder, persisting their session
 * storage states to `.auth/` so downstream specs can reuse them without
 * repeating the login flow.
 *
 * Required env vars:
 *   E2E_INVESTOR_EMAIL, E2E_INVESTOR_PASSWORD
 *   E2E_FOUNDER_EMAIL,  E2E_FOUNDER_PASSWORD
 */

const AUTH_DIR = path.join(process.cwd(), ".auth");

setup("authenticate as investor", async ({ page }) => {
  const email = process.env.E2E_INVESTOR_EMAIL;
  const password = process.env.E2E_INVESTOR_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_INVESTOR_EMAIL and E2E_INVESTOR_PASSWORD must be set",
    );
  }

  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /log\s*in/i }).click();

  // Wait for redirect to investor dashboard
  await page.waitForURL(/\/(companies|dashboard)/, { timeout: 15_000 });
  await expect(page.getByRole("heading").first()).toBeVisible();

  await page.context().storageState({
    path: path.join(AUTH_DIR, "investor.json"),
  });
});

setup("authenticate as founder", async ({ page }) => {
  const email = process.env.E2E_FOUNDER_EMAIL;
  const password = process.env.E2E_FOUNDER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_FOUNDER_EMAIL and E2E_FOUNDER_PASSWORD must be set",
    );
  }

  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /log\s*in/i }).click();

  // Wait for redirect to founder portal
  await page.waitForURL(/\/portal/, { timeout: 15_000 });
  await expect(page.getByRole("heading").first()).toBeVisible();

  await page.context().storageState({
    path: path.join(AUTH_DIR, "founder.json"),
  });
});
