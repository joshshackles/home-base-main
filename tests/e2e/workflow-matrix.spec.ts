import { expect, test } from "@playwright/test";
import { e2eUsers, expectNoAppError, expectPageReady, loginAs, uniqueQaLabel } from "./helpers";

test.describe("end-to-end workflow QA matrix", () => {
  test("public discovery to inquiry workflow", async ({ page }) => {
    await page.goto("/marketplace");
    await expectPageReady(page, /rental marketplace|available|rentals/i);

    const firstListing = page.locator('a[href^="/marketplace/"]').first();
    await expect(firstListing).toBeVisible();
    await firstListing.click();
    await expectPageReady(page, /rent|bed|bath|inquiry|rental/i);

    await page.locator('input[name="name"]').fill(uniqueQaLabel("QA Prospect"));
    await page.locator('input[name="email"]').fill(`qa-prospect-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill("4175550199");
    await page.locator('textarea[name="message"]').fill("End-to-end QA inquiry from the marketplace listing page.");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/lead=success/);
    await expectNoAppError(page);
  });

  test("applicant housing packet workflow surfaces are connected", async ({ page }) => {
    await loginAs(page, e2eUsers.applicant, "/applicant");

    const applicantRoutes = [
      ["/applicant", /dashboard|profile|applications|home/i],
      ["/applicant/profile", /renter profile|household|income/i],
      ["/applicant/applications", /application|status|rental/i],
      ["/applicant/applications/seed-application-jane-doe", /application|Jane Doe|documents/i],
      ["/applicant/documents", /document|upload|request/i],
      ["/applicant/leases", /lease|signature|packet/i],
      ["/applicant/leases/seed-lease-packet-jane-doe", /lease|signature|terms/i],
      ["/applicant/ledger", /ledger|balance|payment/i],
      ["/applicant/payments", /payment|autopay|stripe|method/i],
      ["/applicant/home-tools", /utilities|payment|reminder|home/i]
    ] as const;

    for (const [route, text] of applicantRoutes) {
      await page.goto(route);
      await expectPageReady(page, text);
    }
  });

  test("landlord rental operations workflow surfaces are connected", async ({ page }) => {
    await loginAs(page, e2eUsers.landlord, "/landlord");

    const landlordRoutes = [
      ["/landlord", /dashboard|listings|applications|maintenance/i],
      ["/landlord/rentals", /rental|unit|property|available/i],
      ["/landlord/lifecycle", /rental lifecycle engine|lifecycle lanes|attention/i],
      ["/landlord/rentals/new", /rental|unit|photos|address/i],
      ["/landlord/rentals/seed-unit-102-tenant", /Unit 102|tenant|ledger|maintenance/i],
      ["/landlord/applications", /application|applicant|status/i],
      ["/landlord/leases", /lease|signature|packet/i],
      ["/landlord/ledger", /ledger|rent|balance/i],
      ["/landlord/maintenance", /maintenance|request|status/i],
      ["/landlord/tasks", /task|queue|priority/i],
      ["/landlord/inbox", /inbox|message|thread/i],
      ["/landlord/payments", /stripe|connect|payment/i]
    ] as const;

    for (const [route, text] of landlordRoutes) {
      await page.goto(route);
      await expectPageReady(page, text);
    }
  });

  test("maintenance request creates a linked operations item for staff", async ({ page }) => {
    const subject = uniqueQaLabel("QA sink repair");

    await loginAs(page, e2eUsers.applicant, "/applicant/maintenance");
    await page.locator('select[name="unitId"]').selectOption({ index: 1 });
    await page.locator('select[name="priority"]').selectOption("HIGH");
    await page.locator('input[name="subject"]').fill(subject);
    await page.locator('textarea[name="description"]').fill("The sink has a steady drip during the workflow QA test.");
    await page.locator('textarea[name="accessNotes"]').fill("QA test access note.");
    await page.getByRole("button", { name: /submit request/i }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toContainText(subject);
    await expectNoAppError(page);

    await loginAs(page, e2eUsers.landlord, "/landlord/maintenance");
    await expect(page.locator("body")).toContainText(subject);
    await expectNoAppError(page);
  });

  test("messaging is reachable from applicant and landlord perspectives", async ({ page }) => {
    await loginAs(page, e2eUsers.applicant, "/applicant/inbox");
    await expectPageReady(page, /inbox|messages|thread|maintenance/i);
    await expect(page.locator("body")).toContainText(/Seeded sink leak|message|thread/i);

    await loginAs(page, e2eUsers.landlord, "/landlord/inbox");
    await expectPageReady(page, /inbox|messages|thread|maintenance/i);
    await expect(page.locator("body")).toContainText(/Seeded sink leak|message|thread/i);
  });

  test("admin governance, export, and security surfaces are connected", async ({ page }) => {
    await loginAs(page, e2eUsers.admin, "/admin");

    const adminRoutes = [
      ["/admin", /dashboard|operations|users|security/i],
      ["/admin/users", /users|access|role|approval/i],
      ["/admin/operations", /operations|workflow|queue|task/i],
      ["/admin/lifecycle", /platform rental lifecycle engine|lifecycle lanes|attention/i],
      ["/admin/workflows", /workflow readiness|proven|underdeveloped/i],
      ["/admin/backups", /export|import|backup|data/i],
      ["/admin/reports", /report|analytics|portfolio/i],
      ["/admin/notifications", /notification|signature|message/i],
      ["/admin/security", /security|events|audit/i]
    ] as const;

    for (const [route, text] of adminRoutes) {
      await page.goto(route);
      await expectPageReady(page, text);
    }
  });
});
