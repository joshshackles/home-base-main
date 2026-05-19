import { expect, type Page } from "@playwright/test";

export const demoPassword = process.env.E2E_PASSWORD || "HomeBaseDemo!2026";

export const e2eUsers = {
  admin: process.env.E2E_ADMIN_EMAIL || "admin@homebase.local",
  landlord: process.env.E2E_LANDLORD_EMAIL || "landlord@homebase.local",
  applicant: process.env.E2E_APPLICANT_EMAIL || "applicant@homebase.local",
  inspector: process.env.E2E_INSPECTOR_EMAIL || "inspector@homebase.local"
} as const;

export async function loginAs(page: Page, email: string, next = "/applicant") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toContainText("Invalid email or password", { timeout: 5_000 });
  await expectNoAppError(page);
}

export async function expectNoAppError(page: Page) {
  await expect(page.locator("body")).not.toContainText(
    /Application error|Unhandled Runtime Error|PrismaClientInitializationError|Invalid `prisma\.|Environment variable not found/i
  );
}

export async function expectPageReady(page: Page, text: RegExp) {
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.locator("body")).toContainText(text);
  await expectNoAppError(page);
}

export function uniqueQaLabel(prefix: string) {
  return `${prefix} ${Date.now()}`;
}
