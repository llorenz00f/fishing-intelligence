import { expect, test } from "@playwright/test";

const viewports = [
  [320, 568], [360, 800], [390, 844], [412, 915], [430, 932], [768, 1000], [1440, 1000],
] as const;

test.describe("simplified dashboard", () => {
  for (const [width, height] of viewports) {
    test(`${width}px has a clear primary action and no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/dashboard");
      await expect(page.locator(".score-hero")).toBeVisible();
      await expect(page.locator(".essential-conditions")).toBeVisible();
      await expect(page.locator(".personal-insight-card")).toBeVisible();
      await expect(page.locator(".dashboard-section-links a")).toHaveCount(3);
      await expect(page.locator(".next-days, .explore-banner, .factor-section, .session-card")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const cta = await page.locator(".hero-cta").boundingBox();
      const nav = await page.locator(".bottom-nav").boundingBox();
      if (cta && nav) expect(cta.y + cta.height).toBeLessThanOrEqual(nav.y + 1);
    });
  }

  test("keeps secondary weather data behind progressive disclosure", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator(".essential-detail-grid")).toBeHidden();
    await page.getByText("Vedi tutte le condizioni").click();
    await expect(page.locator(".essential-detail-grid")).toBeVisible();
    await expect(page.locator(".essential-detail-grid")).toContainText("Periodo onda");
  });
});
