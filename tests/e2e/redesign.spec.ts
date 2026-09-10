import { expect, test } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("theme persists and mobile navigation leaves space for the last content", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".score-ring")).toBeVisible();
  await page.getByRole("button", { name: "Attiva tema chiaro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-bottom", "34px");
    document.documentElement.style.setProperty("--safe-top", "44px");
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  const geometry = await page.evaluate(() => ({
    contentBottom: document.querySelector(".route-content")!.getBoundingClientRect().bottom,
    navTop: document.querySelector(".bottom-nav")!.getBoundingClientRect().top,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.contentBottom).toBeLessThan(geometry.navTop);
});

test("forecast day and hour selection, filters and recoverable refresh errors", async ({ page }) => {
  await page.goto("/forecast");
  const days = page.locator(".forecast-day");
  await expect(days).toHaveCount(7);
  await days.first().click();
  await expect(days.first()).toHaveAttribute("aria-pressed", "true");
  const hours = page.locator(".timeline-card");
  await hours.first().click();
  await expect(hours.first()).toHaveAttribute("aria-pressed", "true");
  const opener = page.locator("button.filter-chip").first();
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole("button", { name: "Barca", exact: true }).click();
  await expect(dialog.getByLabel("Tecnica").locator("option")).toHaveCount(6);
  await dialog.getByLabel("Specie").selectOption("DENTICE");
  await dialog.getByRole("button", { name: "Mostra previsioni" }).click();
  await expect(page.locator(".forecast-layout")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".score-verdict")).toContainText("Dentice");
  const before = await page.locator(".score-ring strong").textContent();
  await page.route("**/api/forecast?**", route => route.fulfill({ status: 503, body: "{}" }));
  await page.getByRole("button", { name: "Aggiorna previsioni" }).click();
  await expect(page.locator('.forecast-layout [role="alert"]')).toContainText("ultimi dati disponibili");
  await expect(page.locator(".score-ring strong")).toHaveText(before!);
});

test("journal filtering has a useful empty state and reset", async ({ page }) => {
  await page.goto("/sessions");
  const initial = await page.locator(".session-card").count();
  await page.getByRole("button", { name: "Filtri" }).click();
  await page.getByRole("dialog").getByLabel("Disciplina").selectOption("BOAT");
  await page.getByRole("button", { name: "Mostra uscite" }).click();
  await expect(page.getByRole("heading", { name: "Nessuna uscita trovata" })).toBeVisible();
  await page.getByRole("button", { name: "Mostra tutte" }).click();
  await expect(page.locator(".session-card")).toHaveCount(initial);
});

test("live events survive offline reload without duplicates and closing freezes the timer", async ({ page, context }) => {
  await page.goto("/sessions/new");
  await page.getByRole("button", { name: "Avvia sessione live" }).click();
  await expect(page.getByRole("heading", { name: "Sessione live" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Cattura", exact: true }).click();
  await expect(page.locator(".live-counter-strip > div").nth(1).locator("strong")).toHaveText("1");
  await expect(page.locator(".event-row")).toHaveCount(1);
  await context.setOffline(false);
  await expect(page.locator(".live-sync")).toContainText("Tutto sincronizzato");
  await page.reload();
  await expect(page.locator(".event-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Nota", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Nota", { exact: true }).fill("Corrente in aumento");
  await page.setViewportSize({ width: 390, height: 430 });
  await page.getByRole("button", { name: "Salva nota" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Salva nota" })).toBeInViewport();
  const saveButton = await page.getByRole("button", { name: "Salva nota" }).boundingBox();
  expect(saveButton!.y + saveButton!.height).toBeLessThanOrEqual(430);
  await page.getByRole("button", { name: "Salva nota" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".event-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Cambio spot", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Nuova posizione").fill("Scogliera sud");
  await page.getByRole("button", { name: "Conferma posizione" }).click();
  await expect(page.locator(".live-hero")).toContainText("Scogliera sud");
  await page.getByRole("button", { name: "Termina sessione", exact: true }).click();
  await page.getByRole("button", { name: "Termina e salva" }).click();
  await expect(page.getByRole("heading", { name: "Sessione conclusa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cattura", exact: true })).toHaveCount(0);
  const duration = await page.locator(".live-timer").textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator(".live-timer")).toHaveText(duration!);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sessione conclusa" })).toBeVisible();
  await page.getByRole("link", { name: "Torna al diario", exact: true }).last().click();
  await page.locator(".session-card").filter({ hasText: "Scogliera sud" }).click();
  await expect(page.locator(".page-title")).toContainText("Scogliera sud");
  await expect(page.locator(".event-row")).toHaveCount(4);
});

test("map renders markers, has three sheet states and links to the selected spot", async ({ page, context }) => {
  await page.goto("/map");
  await expect(page.locator(".spot-marker")).toHaveCount(3, { timeout: 25000 });
  await expect(page.locator(".map-bottom-sheet")).toHaveAttribute("data-snap", "medium");
  await page.getByRole("button", { name: "Espandi pannello spot" }).click();
  await expect(page.locator(".map-bottom-sheet")).toHaveAttribute("data-snap", "expanded");
  const handle = await page.locator(".map-sheet-handle").boundingBox();
  await page.mouse.move(handle!.x + 70, handle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(handle!.x + 70, handle!.y + 120, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".map-bottom-sheet")).toHaveAttribute("data-snap", "medium");
  await page.locator(".spot-list").getByRole("button", { name: /Scogliera nord/ }).click();
  await expect(page.locator(".spot-details .skeleton")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Previsioni dello spot" })).toHaveAttribute("href", /lat=42.769.*label=Scogliera%20nord/);
  await page.getByRole("button", { name: "Livelli mappa" }).click();
  await page.getByRole("button", { name: "Mappa stradale" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Vai alla mia posizione" }).click();
  await expect(page.locator(".map-status")).toBeVisible();
  await context.setOffline(true);
  await expect(page.locator(".offline-banner")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.querySelector(".map-bottom-sheet")!.getBoundingClientRect().bottom <= document.querySelector(".bottom-nav")!.getBoundingClientRect().top + 1)).toBe(true);
});

test("account password visibility and onboarding retain their original flows", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: "Mostra password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Nascondi password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.goto("/onboarding");
  await page.getByLabel("Nome visualizzato").fill("Lorenzo");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Barca", exact: true }).click();
  await expect(page.getByRole("button", { name: "Barca", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Salva profilo" }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("fishing-intelligence:onboarding")!).onboardingCompleted)).toBe(true);
});
