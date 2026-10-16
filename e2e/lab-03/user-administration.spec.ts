import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "functional flow only needs one viewport");
});

test("Admin creates a user, hits the safety rules, then resets a password (E2E-04)", async ({ page }) => {
  await loginAs(page, "admin@tiktockit.com", "Admin123!");
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();

  // Create a user (never ADMIN: the API tests rely on a single active Administrator)
  const email = `e2e-user-${Date.now()}@tiktockit.com`;
  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.fill("#name", "E2E Created User");
  await page.fill("#email", email);
  await page.selectOption("#role", "IT_STAFF");
  await page.fill("#initialPassword", "Temp12345!");
  await page.getByRole("button", { name: "Save User" }).click();

  const search = page.getByPlaceholder(/Search users/);
  await search.fill(email);
  await expect(page.locator("tr", { hasText: email })).toHaveCount(1);

  // Duplicate email is rejected
  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.fill("#name", "Duplicate Person");
  await page.fill("#email", "alex.thompson@tiktockit.com");
  await page.fill("#initialPassword", "Temp12345!");
  await page.getByRole("button", { name: "Save User" }).click();
  await expect(page.getByText("A user with this email already exists")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // An Administrator cannot deactivate their own account
  await search.fill("admin@tiktockit.com");
  const adminRow = page.locator("tr", { hasText: "admin@tiktockit.com" });
  await expect(adminRow).toHaveCount(1);
  await adminRow.getByRole("button", { name: "Edit" }).click();
  await page.locator("#edit-isActive").uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("You cannot deactivate your own account")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // Set a new initial password for the created user (prompt, then confirmation alert)
  await search.fill(email);
  const row = page.locator("tr", { hasText: email });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Edit" }).click();

  const passwordUpdated = new Promise<void>((resolve) => {
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") {
        await dialog.accept("Reset12345!");
      } else {
        expect(dialog.message()).toContain("Password updated");
        await dialog.accept();
        resolve();
      }
    });
  });
  await page.getByRole("button", { name: "Set New Password" }).click();
  await passwordUpdated;

  // The user must change that password at the next login
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/login/);
  await loginAs(page, email, "Reset12345!");
  await expect(page.getByRole("heading", { name: "Change Your Password" })).toBeVisible();
});