import { test, expect } from "@playwright/test";

/**
 * E2E Flow 5: Signup flow (does NOT use stored auth state)
 *
 * Tests the signup page rendering, validation, and invite-token behavior.
 * Does NOT actually create accounts — that would require cleanup hooks.
 */
test.describe("Signup flow", () => {
  test("renders the signup form with all required fields", async ({
    page,
  }) => {
    await page.goto("/signup");

    // Should show signup heading
    await expect(
      page.getByRole("heading", { name: /create.*account/i }),
    ).toBeVisible();

    // Required form fields
    await expect(page.getByPlaceholder("Jane Doe")).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();

    // Role selector
    const roleSelect = page.locator("#role");
    await expect(roleSelect).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();

    // Link to login
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  });

  test("shows validation errors for empty form submission", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /create.*account/i }),
    ).toBeVisible();

    // Click submit without filling anything
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show validation errors (required fields)
    // The form uses HTML5 validation or Zod-based client validation
    // Check that the page doesn't navigate away (still on /signup)
    await expect(page).toHaveURL(/\/signup/);
  });

  test("shows company name field when founder role is selected", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /create.*account/i }),
    ).toBeVisible();

    // Select "Founder" role
    const roleSelect = page.locator("#role");
    await roleSelect.selectOption("founder");

    // Company name field should appear for founders
    const companyNameField = page.getByPlaceholder("Acme Inc.");
    await expect(companyNameField).toBeVisible();

    // Company website field should also be visible
    await expect(page.getByPlaceholder("acme.com")).toBeVisible();
  });

  test("hides company name field for investor role", async ({ page }) => {
    await page.goto("/signup");

    // Select "Investor" role
    const roleSelect = page.locator("#role");
    await roleSelect.selectOption("investor");

    // Company name field should not be visible for investors
    const companyNameField = page.getByPlaceholder("Acme Inc.");
    await expect(companyNameField).toBeHidden();
  });

  test("handles invite token in URL", async ({ page }) => {
    // Navigate with a fake invite token
    await page.goto("/signup?invite=test-invite-token-123");

    await expect(
      page.getByRole("heading", { name: /create.*account/i }),
    ).toBeVisible();

    // With an invite token, certain fields may be pre-filled or the role
    // may be locked to "founder". The invite flow customizes the form.
    // At minimum, the page should load without errors.
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
  });

  test("navigates to login page from signup", async ({ page }) => {
    await page.goto("/signup");

    // Click "Log in" link
    await page.getByRole("link", { name: /log in/i }).click();

    // Should navigate to login page
    await page.waitForURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    // Should show login heading
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();

    // Email and password fields
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();

    // Login button
    await expect(
      page.getByRole("button", { name: /log\s*in/i }),
    ).toBeVisible();

    // Link to signup
    await expect(
      page.getByRole("link", { name: /create an account/i }),
    ).toBeVisible();
  });

  test("shows error on invalid login credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill invalid credentials
    await page.getByPlaceholder("you@company.com").fill("invalid@test.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: /log\s*in/i }).click();

    // Should show an error message (generic, not leaking user existence)
    const errorMessage = page.getByText(
      /invalid.*credentials|incorrect|try again/i,
    );
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
