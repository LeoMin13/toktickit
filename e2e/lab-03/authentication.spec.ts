import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { apiLogin } from "../helpers/api";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "functional flow only needs one viewport");
});

test("initial-password login forces a password change before the app opens (E2E-01)", async ({
  page,
  playwright,
}) => {
  const admin = await apiLogin(playwright, "admin@tiktockit.com", "Admin123!");
  const email = `first-login-${Date.now()}@tiktockit.com`;
  const created = await admin.post("/api/admin/users", {
    data: { name: "First Login User", email, role: "REQUESTER", isActive: true, initialPassword: "Temp12345!" },
  });
  expect(created.status()).toBe(201);
  await admin.dispose();

  await loginAs(page, email, "Temp12345!");
  await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();

  // BR-02: the normal application stays unavailable until a new password is saved
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/change-password/);

  await page.fill("#currentPassword", "Temp12345!");
  await page.fill("#newPassword", "NewPass123!");
  await page.fill("#confirmPassword", "NewPass123!");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("password has been changed successfully")).toBeVisible();
  await expect(page).toHaveURL(/\/tickets/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

  // The new password really is the one stored: log out, log back in, no forced change
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/login/);
  await loginAs(page, email, "NewPass123!");
  await expect(page).toHaveURL(/\/tickets/);
});

test("logout removes access to protected pages (E2E-02)", async ({ page }) => {
  await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
  await expect(page.locator("header")).toContainText("Jennifer Anderson");
  await expect(page.locator("header")).toContainText("Requester");

  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/login/);

  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/queue");
  await expect(page).toHaveURL(/\/login/);
});

test("invalid password shows a generic error (E2E-05)", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "jennifer.anderson@example.com");
  await page.fill("#password", "WrongPassword!1");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("inactive account gets the same generic error (E2E-05)", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "former.employee@example.com");
  await page.fill("#password", "Requester123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a Requester has no staff navigation and is denied /queue (E2E-06)", async ({ page }) => {
  await loginAs(page, "jennifer.anderson@example.com", "Requester123!");
  await expect(page.getByRole("link", { name: "My Queue" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

  await page.goto("/queue");
  await expect(page.getByText(/Access denied/)).toBeVisible();
});

test("IT Staff has no Users navigation and is denied /admin/users (E2E-06)", async ({ page }) => {
  await loginAs(page, "alex.thompson@tiktockit.com", "Staff123!");
  await expect(page.getByRole("link", { name: "My Queue" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page.getByText(/Access denied/)).toBeVisible();
});