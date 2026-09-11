import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("appearance keeps the guest flow focused and persists the free theme", async ({ page }) => {
  await page.route("**/api/profile/appearance", route => route.fulfill({ json: { userId: null, plan: "FREE", preferences: null, storage: "local", displayName: null } }));
  await page.goto("/profile/appearance");
  await expect(page.getByRole("heading", { name: "Aspetto" })).toBeVisible();
  await expect(page.locator(".theme-choice")).toHaveCount(6);
  await expect(page.locator(".theme-grid")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("[role=status]")).toContainText(/Preferenze|aggiornato/);

  await page.getByRole("button", { name: "Sunset" }).click();
  const upsell = page.locator("dialog[open]");
  await expect(upsell).toHaveCount(1);
  expect(await upsell.innerText()).toContain("Disponibile con PRO");
  await upsell.getByRole("button", { name: "Chiudi" }).click();

  await page.getByRole("button", { name: "Deep Ocean" }).click();
  await page.getByRole("button", { name: "Chiara" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-palette", "deep-ocean");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    cards: document.querySelectorAll(".theme-choice").length,
  }));
  expect(geometry.cards).toBe(6);
  expect(geometry.overflow).toBeLessThanOrEqual(1);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Deep Ocean" })).toHaveAttribute("aria-pressed", "true");
});
