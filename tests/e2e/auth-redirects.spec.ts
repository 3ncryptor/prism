import { test, expect } from "@playwright/test";

/**
 * These only cover the DB-independent parts of Feature #2 (Auth): the
 * proxy/middleware's redirect behavior and the sign-in page rendering.
 * Actually submitting credentials (success + wrong-password cases) needs a
 * real MongoDB connection and is deferred to manual verification once
 * MONGODB_URI is configured — see qa-report.md.
 */

test("unauthenticated visit to /admin redirects to /sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("unauthenticated visit to /student redirects to /sign-in", async ({ page }) => {
  await page.goto("/student");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("sign-in page renders the email/password form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("homepage shows a Sign in link when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});
