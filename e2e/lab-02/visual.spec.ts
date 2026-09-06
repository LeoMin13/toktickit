import { test } from "@playwright/test";

const VIEWPORT_DIR: Record<string, string> = {
  desktop: "desktop",
  tablet: "tablet",
  mobile: "mobile",
};

test.describe("Zen Green visual screenshots", () => {
  test("Requester Selection and Create Ticket screens", async ({ page }, testInfo) => {
    const viewport = VIEWPORT_DIR[testInfo.project.name];

    await page.goto("/");
    await page.waitForSelector("text=Select Development Requester");
    await page.screenshot({
      path: `../artifacts/lab-02/screenshots/requester-selection/${viewport}.png`,
      fullPage: true,
    });

    await page.selectOption("#requester-select", { index: 0 });
    await page.click("text=Continue");
    await page.waitForSelector("text=My Tickets");

    await page.screenshot({
      path: `../artifacts/lab-02/screenshots/my-tickets/${viewport}.png`,
      fullPage: true,
    });

    await page.click("text=Create Ticket");
    await page.waitForSelector("text=Create Ticket", { strict: false });
    await page.screenshot({
      path: `../artifacts/lab-02/screenshots/create-ticket/${viewport}.png`,
      fullPage: true,
    });
  });

  test("Ticket Detail screen", async ({ page }, testInfo) => {
    const viewport = VIEWPORT_DIR[testInfo.project.name];

    await page.goto("/");
    await page.waitForSelector("text=Select Development Requester");
    await page.selectOption("#requester-select", { index: 0 });
    await page.click("text=Continue");
    await page.waitForSelector("text=My Tickets");

    // Open the first ticket in the list if one exists; skip screenshot if empty.
    const firstTicketLink = page.locator("table a:visible, .card a:visible").first();
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