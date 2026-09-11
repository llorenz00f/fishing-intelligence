import { expect, test } from "@playwright/test";
test.use({ serviceWorkers: "allow" });
test("dashboard and forecast are navigable", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Il tuo mare, oggi." })).toBeVisible();
  await page.getByRole("link", { name: "Forecast", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Quando andare." })).toBeVisible();
});
