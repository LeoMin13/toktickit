import { test } from "@playwright/test";
import { loginAs } from "../helpers/auth";

test.describe("Zen Green visual screenshots (Requester)", () => {
  test("My Tickets and Create Ticket screens", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
    await page.waitForSelector("text=My Tickets");
    await page.screenshot({
      path: `../artifacts/lab-02/screenshots/my-tickets/${viewport}.png`,
      fullPage: true,
    });

    await page.click("text=Create Ticket");
    await page.waitForSelector("text=Submit Ticket");
    await page.screenshot({
      path: `../artifacts/lab-02/screenshots/create-ticket/${viewport}.png`,
      fullPage: true,
    });
  });

  test("Ticket Detail screen", async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
    await page.waitForSelector("text=My Tickets");

    const firstTicketLink = page.locator("table a:visible, a.card:visible").first();
    if (await firstTicketLink.count()) {
      await firstTicketLink.click();
      await page.waitForSelector("text=Ticket Information");
      await page.screenshot({
        path: `../artifacts/lab-02/screenshots/ticket-detail/${viewport}.png`,
        fullPage: true,
      });
    }
  });
});