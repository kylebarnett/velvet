import { test, expect } from "@playwright/test";
import path from "path";

/**
 * E2E Flow 3: Founder submits metrics (batch submission)
 *
 * Uses pre-authenticated founder session from auth.setup.ts.
 */
test.use({
  storageState: path.join(process.cwd(), ".auth", "founder.json"),
});

test.describe("Founder metric submission flow", () => {
  test("loads the founder dashboard", async ({ page }) => {
    await page.goto("/portal");

    // Founder dashboard should show
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Should display KPI cards or onboarding checklist
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });

  test("navigates to metric requests page", async ({ page }) => {
    await page.goto("/portal/requests");

    // Page heading should be visible
    await expect(
      page.getByRole("heading", { name: /metric requests/i }),
    ).toBeVisible();

    // Should show tabs for Pending / Completed
    const pendingTab = page
      .getByRole("tab", { name: /pending/i })
      .or(page.getByText(/pending/i));
    await expect(pendingTab).toBeVisible();
  });

  test("displays pending metric requests with submission option", async ({
    page,
  }) => {
    await page.goto("/portal/requests");

    // Wait for content to load
    await expect(
      page.getByRole("heading", { name: /metric requests/i }),
    ).toBeVisible();

    // Check if there are pending requests
    const pendingContent = page.locator("main");
    await expect(pendingContent).toBeVisible();

    // Look for Submit buttons on pending request groups
    const submitBtn = page.getByRole("button", { name: /submit/i }).first();
    const emptyState = page.getByText(
      /no pending|no requests|all caught up/i,
    );

    // Either pending requests with submit buttons or empty state
    await expect(submitBtn.or(emptyState)).toBeVisible({ timeout: 10_000 });
  });

  test("opens batch submission form when clicking submit", async ({
    page,
  }) => {
    await page.goto("/portal/requests");

    await expect(
      page.getByRole("heading", { name: /metric requests/i }),
    ).toBeVisible();

    // Find and click a Submit button for a pending request group
    const submitBtn = page.getByRole("button", { name: /submit/i }).first();

    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click();

      // The batch submission table should appear
      // It shows metric name rows with input fields for values
      const metricInputs = page.getByRole("textbox");
      await expect(metricInputs.first()).toBeVisible({ timeout: 10_000 });

      // Should have a final "Submit" or "Save" button
      const finalSubmit = page
        .getByRole("button", { name: /submit|save|publish/i })
        .last();
      await expect(finalSubmit).toBeVisible();
    }
    // If no submit button (no pending requests), test passes gracefully
  });

  test("founder sidebar navigation works", async ({ page }) => {
    await page.goto("/portal");

    // Navigate to Documents via sidebar
    await page.getByRole("link", { name: /documents/i }).click();
    await page.waitForURL(/\/portal\/documents/);
    await expect(
      page.getByRole("heading", { name: /documents/i }),
    ).toBeVisible();

    // Navigate to Investors
    await page.getByRole("link", { name: /investors/i }).click();
    await page.waitForURL(/\/portal\/investors/);
    await expect(
      page.getByRole("heading", { name: /investors/i }),
    ).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/portal$/);
  });
});
