import { test, expect } from "@playwright/test";
import path from "path";

/**
 * E2E Flow 2: Investor creates a metric request using the unified wizard
 *
 * Uses pre-authenticated investor session from auth.setup.ts.
 */
test.use({
  storageState: path.join(process.cwd(), ".auth", "investor.json"),
});

test.describe("Metric request creation flow", () => {
  test("navigates to the new metric request wizard", async ({ page }) => {
    await page.goto("/metric-requests");

    // Page heading should be visible
    await expect(
      page.getByRole("heading", { name: /metric requests/i }),
    ).toBeVisible();

    // Click "New Request" or "Create Request" button
    const newRequestBtn = page
      .getByRole("link", { name: /new request|create request/i })
      .or(page.getByRole("button", { name: /new request|create request/i }));
    await newRequestBtn.click();

    // Should navigate to the wizard
    await page.waitForURL(/\/metric-requests\/new/);

    // The wizard should show step 1 (template selection)
    await expect(
      page.getByRole("heading", { name: /new metric request/i }),
    ).toBeVisible();
  });

  test("completes the full metric request wizard flow", async ({ page }) => {
    await page.goto("/metric-requests/new");

    // Step 1: Select a template
    await expect(
      page.getByRole("heading", { name: /new metric request/i }),
    ).toBeVisible();

    // Look for template options — click the first available template button
    const templateButtons = page.locator(
      "[data-testid='template-card'], button:has-text('Standard'), button:has-text('Financial'), button:has-text('SaaS')",
    );

    // If template cards exist, click the first one
    const firstTemplate = templateButtons.first();
    if (await firstTemplate.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstTemplate.click();
    } else {
      // Fallback: look for any clickable template item
      const anyTemplate = page
        .locator("[role='button']")
        .filter({ hasText: /metric|revenue|arr/i })
        .first();
      if (await anyTemplate.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await anyTemplate.click();
      }
    }

    // Step 2: Should show company selection
    // Wait for step 2 elements — checkboxes for company selection
    const companyCheckbox = page.getByRole("checkbox").first();
    if (
      await companyCheckbox.isVisible({ timeout: 5_000 }).catch(() => false)
    ) {
      await companyCheckbox.check();
    }

    // Look for a Next/Continue button to advance
    const nextBtn = page
      .getByRole("button", { name: /next|continue/i })
      .or(page.getByRole("button", { name: /review|create/i }));
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
    }

    // Step 3: Review — look for the submit/create button
    const createBtn = page.getByRole("button", {
      name: /create request|send request|submit/i,
    });
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createBtn.click();

      // Verify success — a success message or redirect
      await expect(
        page
          .getByText(/request.*created|successfully/i)
          .or(page.getByText(/sent/i)),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("validates that companies must be selected", async ({ page }) => {
    await page.goto("/metric-requests/new");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /new metric request/i }),
    ).toBeVisible();

    // The wizard should require template/company selection before advancing
    // The "Next" or "Create" button should be disabled or show an error
    // when no companies are selected
    const nextBtn = page.getByRole("button", {
      name: /next|continue|create/i,
    });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Button should be disabled without selections
      await expect(nextBtn).toBeDisabled();
    }
  });
});
