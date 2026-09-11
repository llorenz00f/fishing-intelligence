import { expect, test } from "@playwright/test";
import { ForecastService, type ForecastViewModel } from "../../src/application/services/forecast-service";
import { MockBathymetryProvider, MockMarineProvider, MockWeatherProvider } from "../../src/infrastructure/providers/mock";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", timezoneId: "Europe/Rome" });
test.setTimeout(90_000);
let fixture: ForecastViewModel;
test.beforeAll(async () => {
  fixture = await new ForecastService({ weather: new MockWeatherProvider(), marine: new MockMarineProvider(), bathymetry: new MockBathymetryProvider() }).getForecast({
    location: { latitude: 42.7639, longitude: 10.8813, label: "Test meteo" }, start: new Date().toISOString(), days: 2, discipline: "SHORE_SPINNING", technique: "SHORE_SPINNING",
  });
});
test.beforeEach(async ({ page }) => {
  await page.route("**/api/profile/appearance", route => route.fulfill({ json: { userId: null, plan: "CAPTAIN", preferences: null, storage: "local", displayName: null } }));
});

test("current weather drives ambience independently of selected forecast hours; waves move smoothly", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("fi:appearance:guest", JSON.stringify({ themeId: "dynamic-weather", dynamicWeatherThemeEnabled: true, ambientEffectIntensity: "standard", appearanceMode: "dark", reducedMotion: false })));
  const data = structuredClone(fixture);
  data.current = structuredClone(data.current);
  const now = new Date();
  data.current.timestamp = data.current.snapshot.timestamp = now.toISOString();
  data.current.snapshot.astronomical = { sunrise: `${now.toISOString().slice(0, 10)}T00:01:00.000Z`, sunset: `${now.toISOString().slice(0, 10)}T23:59:00.000Z`, isDay: true };
  data.current.snapshot.provider = "open-meteo-weather+open-meteo-marine";
  data.current.snapshot.weather = { weatherCode: 61, precipitationMm: 0.8, cloudCoverPct: 100, windSpeedKph: 8, airTemperatureC: 22 };
  for (const day of data.days) for (const hour of day.hours) {
    hour.snapshot.weather = { weatherCode: 0, precipitationMm: 0, cloudCoverPct: 0, windSpeedKph: 8 };
    hour.snapshot.marine.waveHeightM = 1.8;
    hour.snapshot.marine.wavePeriodSec = 6;
  }
  await page.route("**/api/forecast?**", route => route.fulfill({ json: data }));
  await page.goto("/forecast");
  await page.getByRole("button", { name: "Aggiorna previsioni" }).click();
  await expect(page.locator(".weather-current")).toHaveAttribute("data-weather", "rain");
  await expect(page.locator("html")).toHaveAttribute("data-weather", "rain");
  await expect(page.locator(".weather-current time")).toHaveText(new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(now));
  await page.locator(".timeline-card").last().click();
  await expect(page.locator("html")).toHaveAttribute("data-weather", "rain");
  const wave = page.locator(".wave-line");
  await expect(wave).toHaveAttribute("data-wave-height", "1.8");
  const track = wave.locator(".wave-track").last();
  await wave.scrollIntoViewIfNeeded();
  const before = await track.evaluate(node => getComputedStyle(node).transform);
  const pixelsBefore = await wave.screenshot({ path: testInfo.outputPath("wave-frame-1.png"), animations: "allow" });
  await page.waitForTimeout(600);
  const pixelsAfter = await wave.screenshot({ path: testInfo.outputPath("wave-frame-2.png"), animations: "allow" });
  expect(await track.evaluate(node => getComputedStyle(node).transform)).not.toBe(before);
  expect(pixelsBefore.equals(pixelsAfter)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("rain-mobile.png"), fullPage: true });
  await page.locator(".marine-conditions").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("conditions-mobile-viewport.png") });

  data.current.snapshot.weather = { weatherCode: 0, precipitationMm: 0, cloudCoverPct: 0, windSpeedKph: 5 };
  await page.getByRole("button", { name: "Aggiorna previsioni" }).click();
  await expect(page.locator(".weather-current")).toHaveAttribute("data-weather", "clear-day");
  await expect(page.locator("html")).toHaveAttribute("data-weather", "clear-day");
  data.current.snapshot.provider = "fallback";
  await page.getByRole("button", { name: "Aggiorna previsioni" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-weather", "neutral");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
  await expect(track).toHaveCSS("animation-duration", "1e-05s");
});

test("light palettes are distinct, persist and fit narrow through desktop viewports", async ({ page }, testInfo) => {
  await page.goto("/profile/appearance");
  await expect(page.locator(".theme-grid")).toHaveAttribute("aria-busy", "false");
  const colors: string[] = [];
  for (const theme of ["Mediterranean Light", "Sunset", "Graphite Marine"]) {
    await page.getByRole("button", { name: theme, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    colors.push(await page.locator("html").evaluate(node => getComputedStyle(node).getPropertyValue("--background")));
    await page.waitForTimeout(1000);
    await expect(page.locator(".skip-link")).not.toBeInViewport();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`${theme.replaceAll(" ", "-")}-mobile.png`), fullPage: true });
  }
  expect(new Set(colors).size).toBe(3);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-palette", "graphite-marine");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Scura", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Chiara", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`palettes-${width}.png`), fullPage: true });
  }
  await page.goto("/dashboard");
  await page.screenshot({ path: testInfo.outputPath("dashboard-light-desktop.png"), fullPage: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`dashboard-light-${width}.png`), fullPage: true });
  }
});

test("device location updates the dashboard and persists into forecast", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 43.55, longitude: 10.3 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Usa la mia posizione" }).click();
  await expect(page.locator(".mobile-header:visible .location-label")).toContainText("43.55", { timeout: 30_000 });
  expect((await context.cookies()).find(cookie => cookie.name === "fi-forecast-location")?.value).toContain("43.55");
  await page.goto("/forecast");
  await expect(page.locator(".mobile-header:visible .location-label")).toContainText("43.55");
  await page.getByRole("button", { name: "Cambia posizione" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Latitudine")).toHaveValue("43.55");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({ path: testInfo.outputPath("location-dialog-320.png") });
  await dialog.getByRole("button", { name: "Chiudi" }).click();
  await context.clearPermissions();
  await page.addInitScript(() => Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: (_success: unknown, fail: (error: { code: number }) => void) => fail({ code: 1 }) } }));
  await page.reload();
  await page.getByRole("button", { name: "Usa la mia posizione" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Accesso alla posizione negato" })).toBeVisible();
  await expect(page.locator(".mobile-header:visible .location-label")).toContainText("43.55");
});
