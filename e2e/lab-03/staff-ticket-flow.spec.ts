import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { apiLogin, createTicketViaApi } from "../helpers/api";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "functional flow only needs one viewport");
});

test("IT Staff works a ticket end to end; the Requester only sees public information (E2E-03)", async ({
  page,
  playwright,
}) => {
  const uniqueId = String(Date.now());
  const noteText = `Internal only ${uniqueId}`;
  const commentText = `Public reply ${uniqueId}`;

  // Setup through the API: a Requester files a ticket and flags it as resolved
  const requesterApi = await apiLogin(playwright, "jennifer.anderson@example.com", "Requester123!");
  const ticket = await createTicketViaApi(requesterApi, `Staff flow ticket ${uniqueId}`);
  await requesterApi.patch(`/api/tickets/${ticket.id}/resolved`);
  await requesterApi.dispose();

  // IT Staff finds the ticket in the queue
  await loginAs(page, "alex.thompson@tiktockit.com", "Staff123!");
  await expect(page.getByRole("heading", { name: "My Queue" })).toBeVisible();

  const searchResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/staff/tickets?") &&
      res.url().includes(`search=${uniqueId}`) &&
      res.status() === 200
  );
  await page.getByPlaceholder(/Search by ticket number/).fill(uniqueId);
  await page.getByRole("button", { name: "Search" }).click();
  await searchResponse;

  const link = page.locator(`table a:visible:has-text("${ticket.ticketNumber}")`).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.getByRole("heading", { name: "Ticket Information" })).toBeVisible();

  const info = page.locator("section[aria-label='Ticket Information']");
  await expect(info).toContainText("The Requester has indicated this problem appears resolved.");

  // Claim: unassigned -> owned by the current IT Staff member
  await page.getByRole("button", { name: "Claim Ticket" }).click();
  await expect(info).toContainText("Alex Thompson");
  await expect(page.getByRole("button", { name: "Claim Ticket" })).toHaveCount(0);

  // IT Priority starts equal to the Requested Priority (BR-07), then changes
  await expect(page.locator("#itPriority")).toHaveValue("LOW");
  await page.selectOption("#itPriority", "HIGH");
  await expect(page.locator("#itPriority")).toHaveValue("HIGH");

  // Status: a permitted transition, then a forbidden one
  await page.selectOption("#status", "OPEN");
  await expect(page.locator("#status")).toHaveValue("OPEN");

  await page.selectOption("#status", "RESOLVED");
  await expect(page.locator(".alert-danger")).toContainText("not permitted");
  await expect(page.locator("#status")).toHaveValue("OPEN");

  // Internal note and public comment, in two visually separate sections
  const notes = page.locator("section[aria-label='Internal Notes']");
  await notes.getByPlaceholder(/internal note/).fill(noteText);
  await notes.getByRole("button", { name: "Post" }).click();
  await expect(notes).toContainText(noteText);

  const comments = page.locator("section[aria-label='Public Comments']");
  await comments.getByPlaceholder(/public comment/).fill(commentText);
  await comments.getByRole("button", { name: "Post" }).click();
  await expect(comments).toContainText(commentText);
  await expect(comments).not.toContainText(noteText);

  // The Requester sees the public comment and the new status, never the note
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/login/);
  await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole("heading", { name: "Ticket Information" })).toBeVisible();

  await expect(page.locator("body")).toContainText(commentText);
  await expect(page.locator("body")).not.toContainText(noteText);
  await expect(page.locator("section[aria-label='Ticket Information']")).toContainText("OPEN");

  // Direct API authorization evidence: the Requester session is refused on notes
  const notesResponse = await page.request.get(`http://localhost:3000/api/tickets/${ticket.id}/notes`);
  expect(notesResponse.status()).toBe(403);
  expect(await notesResponse.text()).not.toContain(noteText);
});