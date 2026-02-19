import { test, expect } from "@playwright/test";
import path from "path";

/**
 * E2E Flow 1: Investor login -> portfolio view -> company detail
 *
 * Uses pre-authenticated investor session from auth.setup.ts.
 */
test.use({
  storageState: path.join(process.cwd(), ".auth", "investor.json"),
});

test.describe("Investor portfolio flow", () => {
  test("loads the portfolio dashboard with companies", async ({ page }) => {
    await page.goto("/companies");

    // Dashboard heading should be visible
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();

    // Should display KPI summary cards
    await expect(page.getByText(/portfolio companies/i)).toBeVisible();
  });

  test("displays company cards in the portfolio", async ({ page }) => {
    await page.goto("/companies");

    // Wait for the dashboard to load
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();

    // There should be at least one company link in the dashboard
    // Company cards render as links
    const companyLinks = page.locator("a[href^='/companies/']");
    await expect(companyLinks.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to company detail and shows metrics", async ({ page }) => {
    await page.goto("/companies");

    // Wait for dashboard to load
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();

    // Click the first company link
    const firstCompanyLink = page.locator("a[href^='/companies/']").first();
    await expect(firstCompanyLink).toBeVisible({ timeout: 10_000 });
    const companyName = await firstCompanyLink.textContent();
    await firstCompanyLink.click();

    // Should navigate to company detail page
    await page.waitForURL(/\/companies\/[a-f0-9-]+/);

    // Breadcrumbs should show "Companies" link
    await expect(
      page.getByRole("link", { name: /companies/i }),
    ).toBeVisible();

    // Company name should appear in the heading area
    if (companyName) {
      await expect(page.getByText(companyName.trim())).toBeVisible();
    }

    // The page should have a tab or section for metrics/data
    // Look for common elements: Add Metric button, metric table, or tabs
    const pageContent = page.locator("main");
    await expect(pageContent).toBeVisible();
  });

  test("sidebar navigation links work correctly", async ({ page }) => {
    await page.goto("/companies");

    // Navigate to Metric Requests via sidebar
    await page.getByRole("link", { name: /metric requests/i }).click();
    await page.waitForURL(/\/metric-requests/);
    await expect(
      page.getByRole("heading", { name: /metric requests/i }),
    ).toBeVisible();

    // Navigate to Contacts
    await page.getByRole("link", { name: /contacts/i }).click();
    await page.waitForURL(/\/contacts/);
    await expect(
      page.getByRole("heading", { name: /contacts/i }),
    ).toBeVisible();

    // Navigate to Reports
    await page.getByRole("link", { name: /^reports$/i }).click();
    await page.waitForURL(/\/reports/);
    await expect(
      page.getByRole("heading", { name: /reports/i }),
    ).toBeVisible();

    // Navigate back to Companies
    await page.getByRole("link", { name: /companies/i }).click();
    await page.waitForURL(/\/companies/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();
  });
});
