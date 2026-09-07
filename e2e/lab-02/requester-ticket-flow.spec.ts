import { test, expect } from "@playwright/test";

test.describe("Requester ticket flow", () => {
  test("select Requester → create ticket with attachment → find in My Tickets → open Detail (E2E-01)", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Select Development Requester");

    await page.selectOption("#requester-select", { index: 0 });
    await page.click("text=Continue");
    await page.waitForSelector("text=My Tickets");

    await page.click("text=Create Ticket");
    await page.waitForSelector("text=Create Ticket");

    const uniqueId = String(Date.now());
    const uniqueSummary = `E2E test ticket ${uniqueId}`;

    await page.fill("#summary", uniqueSummary);
    await page.fill(
      "#description",
      "This ticket is created by the Lab 2 end-to-end test to verify the full Requester flow."
    );
    await page.selectOption("#requestedPriority", "HIGH");

    await page.setInputFiles("#attachments", {
      name: "evidence.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e test content"),
    });

    await page.click("text=Submit Ticket");

    await page.waitForSelector('[role="status"].alert-success', { timeout: 15000 });

    const ticketNumberLocator = page.locator("strong");
    await expect(ticketNumberLocator).toContainText(/TKT-\d{4}-\d{6}/, { timeout: 5000 });
    const ticketNumber = (await ticketNumberLocator.textContent())?.trim() ?? "";

    await page.click("text=My Tickets");
    await page.waitForSelector("text=My Tickets");

    // Search with a space-free, unique token so we can reliably identify
    // the response that actually corresponds to THIS search, not an
    // unrelated /api/tickets fetch (e.g. the list's initial page load).
    const searchResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/tickets?") && res.url().includes(`search=${uniqueId}`) && res.status() === 200
    );
    await page.fill('input[placeholder*="Search"]', uniqueId);
    await page.click("text=Search");
    await searchResponsePromise;

    const ticketLink = page.locator(`a:visible:has-text("${ticketNumber}")`).first();
    await expect(ticketLink).toBeVisible({ timeout: 10000 });

    await ticketLink.click();
    await page.waitForSelector("text=Ticket Information");
    await expect(page.locator("body")).toContainText(uniqueSummary);

    await expect(page.locator("text=evidence.pdf")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.click("text=Download");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("evidence.pdf");
  });

  test("Requester A's ticket is inaccessible to Requester B via direct URL (E2E-02)", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Select Development Requester");
    await page.selectOption("#requester-select", { index: 0 });
    await page.click("text=Continue");
    await page.waitForSelector("text=My Tickets");

    await page.click("text=Create Ticket");
    await page.waitForSelector("text=Create Ticket");

    const uniqueId = String(Date.now());
    const summaryA = `Requester A private ticket ${uniqueId}`;
    await page.fill("#summary", summaryA);
    await page.fill(
      "#description",
      "This ticket belongs to Requester A and must not be visible to Requester B."
    );
    await page.click("text=Submit Ticket");

    await page.waitForSelector('[role="status"].alert-success', { timeout: 15000 });

    const ticketNumberLocator = page.locator("strong");
    await expect(ticketNumberLocator).toContainText(/TKT-\d{4}-\d{6}/, { timeout: 5000 });

    await page.click("text=My Tickets");
    await page.waitForSelector("text=My Tickets");

    const searchResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/tickets?") && res.url().includes(`search=${uniqueId}`) && res.status() === 200
    );
    await page.fill('input[placeholder*="Search"]', uniqueId);
    await page.click("text=Search");
    await searchResponsePromise;

    const ticketLink = page.locator("table a:visible, a.card:visible").first();
    await expect(ticketLink).toBeVisible({ timeout: 10000 });
    const href = await ticketLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.click("text=Change Requester");
    await page.waitForSelector("text=Select Development Requester");
    await page.selectOption("#requester-select", { index: 1 });
    await page.click("text=Continue");
    await page.waitForSelector("text=My Tickets");

    await page.goto(href!);
    await expect(page.locator("text=Ticket not found.")).toBeVisible();
  });
});