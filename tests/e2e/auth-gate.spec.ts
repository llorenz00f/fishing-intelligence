import { expect, test } from "@playwright/test";

test("private areas require a real authenticated session", async ({ page }) => {
  for (const route of ["/dashboard", "/forecast", "/map", "/sessions", "/insights", "/profile"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Bentornato" })).toBeVisible();
  }
});

test("registration exposes the beta opt-in without exposing private data", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Crea il tuo account" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Beta tester/i })).toBeVisible();
  await expect(page.getByText("Spot e coordinate restano privati per default.")).toBeVisible();
});
