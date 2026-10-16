import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";

test.describe("Requester ticket flow", () => {
  test("login → create ticket with attachment → find in My Tickets → open Detail (E2E-01)", async ({ page }) => {
    await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    await page.getByRole("link", { name: "Create Ticket" }).first().click();
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeVisible();

    const uniqueId = String(Date.now());
    const uniqueSummary = `E2E test ticket ${uniqueId}`;

    await page.fill("#summary", uniqueSummary);
    await page.fill(
      "#description",
      "This ticket is created by the end-to-end test to verify the full Requester flow."
    );
    await page.selectOption("#requestedPriority", "HIGH");

    await page.setInputFiles("#attachments", {
      name: "evidence.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e test content"),
    });

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await page.waitForSelector('[role="status"].alert-success', { timeout: 15000 });

    const ticketNumberLocator = page.locator("strong");
    await expect(ticketNumberLocator).toContainText(/TKT-\d{4}-\d{6}/, { timeout: 5000 });
    const ticketNumber = (await ticketNumberLocator.textContent())?.trim() ?? "";

    await page.getByRole("link", { name: "My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    const searchResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/tickets?") &&
        res.url().includes(`search=${uniqueId}`) &&
        res.status() === 200
    );
    await page.getByPlaceholder(/Search by ticket number/).fill(uniqueId);
    await page.getByRole("button", { name: "Search" }).click();
    await searchResponsePromise;

    const ticketLink = page.locator(`a:visible:has-text("${ticketNumber}")`).first();
    await expect(ticketLink).toBeVisible({ timeout: 10000 });

    await ticketLink.click();
    await expect(page.getByRole("heading", { name: "Ticket Information" })).toBeVisible();
    await expect(page.locator("body")).toContainText(uniqueSummary);
    await expect(page.locator("text=evidence.pdf")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("evidence.pdf");
  });

  test("Requester A's ticket is inaccessible to Requester B via direct URL (E2E-02)", async ({ page }) => {
    await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    await page.getByRole("link", { name: "Create Ticket" }).first().click();
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeVisible();

    const uniqueId = String(Date.now());
    await page.fill("#summary", `Requester A private ticket ${uniqueId}`);
    await page.fill(
      "#description",
      "This ticket belongs to Requester A and must not be visible to Requester B."
    );
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await page.waitForSelector('[role="status"].alert-success', { timeout: 15000 });

    await page.getByRole("link", { name: "My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    const searchResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/tickets?") &&
        res.url().includes(`search=${uniqueId}`) &&
        res.status() === 200
    );
    await page.getByPlaceholder(/Search by ticket number/).fill(uniqueId);
    await page.getByRole("button", { name: "Search" }).click();
    await searchResponsePromise;

    const ticketLink = page.locator("table a:visible, a.card:visible").first();
    await expect(ticketLink).toBeVisible({ timeout: 10000 });
    const href = await ticketLink.getAttribute("href");
    expect(href).toBeTruthy();

    // Switch identity: log out, then sign in as a different Requester
    await page.getByRole("button", { name: "Logout" }).click();
    await page.waitForURL(/\/login/);
    await loginAs(page, "michael.brown@example.com", "Requester123!");

    await page.goto(href!);
    await expect(page.locator("text=Ticket not found.")).toBeVisible();
  });
});