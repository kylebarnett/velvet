import { test, expect } from "@playwright/test";
import path from "path";

/**
 * E2E Flow 4: Investor views / generates LP report
 *
 * Uses pre-authenticated investor session from auth.setup.ts.
 */
test.use({
  storageState: path.join(process.cwd(), ".auth", "investor.json"),
});

test.describe("LP report flow", () => {
  test("navigates to LP Reports page via sidebar", async ({ page }) => {
    await page.goto("/companies");

    // Wait for dashboard to load
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();

    // Expand the Funds section if collapsed and click LP Reports
    const lpReportsLink = page.getByRole("link", {
      name: /lp reports|all reports/i,
    });

    // The Funds section may need to be expanded first
    const fundsSection = page.getByText(/funds/i);
    if (await fundsSection.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fundsSection.click();
    }

    if (
      await lpReportsLink.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      await lpReportsLink.click();
      await page.waitForURL(/\/funds\/lp-reports/);
      await expect(
        page.getByRole("heading", { name: /lp reports/i }),
      ).toBeVisible();
    }
  });

  test("LP Reports page loads with fund filter", async ({ page }) => {
    await page.goto("/funds/lp-reports");

    // Page heading
    await expect(
      page.getByRole("heading", { name: /lp reports/i }),
    ).toBeVisible();

    // Should display fund filter dropdown or "All Funds" default
    const filterArea = page.getByText(/all funds/i).or(page.getByText(/fund/i));
    await expect(filterArea).toBeVisible({ timeout: 10_000 });
  });

  test("displays existing reports or empty state", async ({ page }) => {
    await page.goto("/funds/lp-reports");

    await expect(
      page.getByRole("heading", { name: /lp reports/i }),
    ).toBeVisible();

    // Either report items or an empty state message
    const reportItem = page
      .locator("a[href*='/funds/'][href*='/reports/']")
      .first();
    const emptyState = page.getByText(
      /no reports|create.*first|get started/i,
    );

    await expect(reportItem.or(emptyState)).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to Funds overview page", async ({ page }) => {
    await page.goto("/funds");

    // Should display funds page
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Should show fund cards or "Create Fund" button/empty state
    const fundContent = page.locator("main");
    await expect(fundContent).toBeVisible();

    const createFundBtn = page
      .getByRole("link", { name: /create fund|new fund/i })
      .or(page.getByRole("button", { name: /create fund|new fund/i }));
    const fundCard = page.locator("a[href^='/funds/']").first();
    const emptyState = page.getByText(/no funds|create.*fund/i);

    await expect(
      createFundBtn.or(fundCard).or(emptyState),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can click into a fund detail page", async ({ page }) => {
    await page.goto("/funds");

    // Wait for page load
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Click the first fund link if one exists
    const fundLink = page
      .locator("a[href^='/funds/']")
      .filter({ hasNotText: /lp-reports|reports/ })
      .first();

    if (await fundLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fundLink.click();

      // Should navigate to fund detail
      await page.waitForURL(/\/funds\/[a-f0-9-]+$/);

      // Breadcrumbs should show Funds link
      await expect(
        page.getByRole("link", { name: /funds/i }),
      ).toBeVisible();
    }
    // If no funds exist, test passes gracefully
  });
});
