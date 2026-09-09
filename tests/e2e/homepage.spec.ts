import { test, expect } from "@playwright/test";

test("homepage renders the Prism landing content", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Explainable resume-to-JD matching",
  );
});
