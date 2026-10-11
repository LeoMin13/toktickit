import { test } from "@playwright/test";
import { loginAs } from "../helpers/auth";

test.describe("Lab 3 Zen Green visual screenshots", () => {
  test("Login and Change Password screens", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await page.goto("/login");
    await page.waitForSelector("text=Sign in to your account");
    await page.screenshot({
      path: `../artifacts/lab-03/screenshots/authentication/${viewport}-login.png`,
      fullPage: true,
    });
  });

  test("IT Staff Queue and Ticket Detail", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await loginAs(page, "alex.thompson@tiktockit.com", "Staff123!");
    await page.waitForSelector("h1:has-text('My Queue')");
    await page.screenshot({
      path: `../artifacts/lab-03/screenshots/staff-queue/${viewport}.png`,
      fullPage: true,
    });

    const firstTicketLink = page.locator("table a:visible, a.card:visible").first();
    if (await firstTicketLink.count()) {
      await firstTicketLink.click();
      await page.waitForSelector("text=Ticket Information");
      await page.screenshot({
        path: `../artifacts/lab-03/screenshots/staff-ticket-detail/${viewport}.png`,
        fullPage: true,
      });
    }
  });

  test("Admin User Management", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await loginAs(page, "admin@tiktockit.com", "Admin123!");
    await page.goto("/admin/users");
    await page.waitForSelector("h1:has-text('Users')");
    await page.screenshot({
      path: `../artifacts/lab-03/screenshots/user-management/${viewport}.png`,
      fullPage: true,
    });
  });
});