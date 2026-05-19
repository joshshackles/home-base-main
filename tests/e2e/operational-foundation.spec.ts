import { expect, test } from "@playwright/test";
import { demoPassword, e2eUsers, loginAs } from "./helpers";

test.describe("operational foundation smoke coverage", () => {
  test("signup can request landlord access", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/signup");
    await page.getByLabel("Legal name").fill(`Smoke Applicant ${unique}`);
    await page.getByLabel("Email").fill(`smoke-${unique}@example.com`);
    await page.getByLabel("Phone").fill("4175550101");
    await page.getByLabel("Password", { exact: true }).fill(demoPassword);
    await page.getByLabel("Confirm password").fill(demoPassword);
    await page.getByLabel(/I also want to list/i).check();
    await page.getByLabel(/Company or property name/i).fill("Smoke Test Rentals");
    await page.getByLabel(/Landlord request note/i).fill("Playwright smoke test access request.");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/applicant|login|not-authorized/);
  });

  test("admin access approval page loads", async ({ page }) => {
    await loginAs(page, e2eUsers.admin, "/admin/users");
    await page.goto("/admin/users");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/access|user|role|admin/i);
  });

  test("landlord listing creation and multi-photo upload screens load", async ({ page }) => {
    await loginAs(page, e2eUsers.landlord, "/landlord/rentals/new");
    await page.goto("/landlord/rentals/new");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator('input[type="file"][name="photos"]').first()).toHaveAttribute("multiple", "");
    await expect(page.locator('input[type="file"][name="photos"]').first()).toHaveAttribute("accept", /image/);
  });

  test("tenant assignment workflow is reachable", async ({ page }) => {
    await loginAs(page, e2eUsers.landlord, "/landlord/applications");
    await page.goto("/landlord/applications");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/tenant|application|assign|approve/i);
  });

  test("messaging inbox loads for applicant and landlord", async ({ page }) => {
    await loginAs(page, e2eUsers.applicant, "/applicant/inbox");
    await page.goto("/applicant/inbox");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.goto("/login?next=/landlord/inbox");
    await loginAs(page, e2eUsers.landlord, "/landlord/inbox");
    await page.goto("/landlord/inbox");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("Stripe checkout setup surfaces payment setup controls", async ({ page }) => {
    await loginAs(page, e2eUsers.landlord, "/landlord/payments");
    await page.goto("/landlord/payments");
    await expect(page.locator("body")).toContainText(/stripe|connect|payment|checkout/i);
    await loginAs(page, e2eUsers.applicant, "/applicant/payments");
    await page.goto("/applicant/payments");
    await expect(page.locator("body")).toContainText(/payment|method|autopay|stripe/i);
  });

  test("mobile drawer and command palette open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, e2eUsers.landlord, "/landlord");
    await page.getByRole("button", { name: /open navigation/i }).click();
    await expect(page.getByRole("dialog", { name: /dashboard navigation/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
  });
});
