import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow", reducedMotion: "reduce" });

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`basemap survives an offline-worker-controlled reload at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await page.goto("/map");
    // Dev does not auto-register the worker; explicitly enable the production path in both environments.
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
        });
      }
    });

    // Drain the first map's requests so the reload cannot match a response from the discarded page.
    await page.waitForLoadState("networkidle");
    const styleResponse = page.waitForResponse("https://tiles.openfreemap.org/styles/liberty");
    const tileResponse = page.waitForResponse((response) =>
      response.url().includes("tiles.openfreemap.org/planet/") && response.url().endsWith(".pbf"),
    );
    const [style, tile] = await Promise.all([styleResponse, tileResponse, page.reload()]);
    expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    expect(style.ok()).toBe(true);
    expect(style.fromServiceWorker()).toBe(false);
    expect(await style.json()).toMatchObject({ version: 8 });
    expect(tile.ok()).toBe(true);
    expect(tile.fromServiceWorker()).toBe(false);
    expect(tile.headers()["content-type"]).toContain("application/vnd.mapbox-vector-tile");
    expect((await tile.body()).byteLength).toBeGreaterThan(100);

    await expect(page.locator(".maplibregl-ctrl-attrib")).toContainText("OpenStreetMap");
    await expect(page.locator(".spot-marker")).toHaveCount(3);
    await expect(page.locator(".map-status")).toHaveCount(0);
    await testInfo.attach(`basemap-${viewport.width}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.getByRole("button", { name: "Livelli mappa" }).click();
    await page.getByRole("button", { name: "Mappa stradale" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.locator(".spot-list").getByRole("button", { name: /Scogliera nord/ }).click();
    await expect(page.getByRole("link", { name: "Previsioni dello spot" })).toHaveAttribute("href", /lat=42.769/);
    await expect(page.locator(".map-status")).toHaveCount(0);
  });
}
