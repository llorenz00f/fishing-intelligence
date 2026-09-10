import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const directory = path.resolve("test-results/redesign-audit");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const routes = ["/dashboard", "/forecast", "/map", "/sessions", "/sessions/new", "/sessions/session-1", "/sessions/session-1/live", "/insights", "/assistant", "/onboarding", "/login", "/register", "/forgot-password", "/"];
const sizes = [[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[768,1024],[1280,800],[1440,900]];
const issues = [];
const runtimeErrors = new Set();
let checks = 0;
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
page.on("pageerror", error => runtimeErrors.add(error.message));
for (const theme of ["dark", "light"]) {
  await context.addInitScript(theme => { localStorage.setItem("fishing-theme", theme); }, theme);
  for (const route of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("http://localhost:3000" + route);
    await page.locator("h1").first().waitFor({ state: "attached", timeout: 20000 });
    if (route === "/map") await page.locator(".spot-marker").first().waitFor({ timeout: 25000 });
    await page.waitForTimeout(150);
    if (response.status() >= 400) issues.push({ theme, route, status: response.status() });
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(80);
      const result = await page.evaluate(() => {
        const vw = window.innerWidth;
        const visible = element => element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !element.closest("dialog:not([open])");
        const touch = [...document.querySelectorAll('button, a, input, select, textarea, summary')].filter(element => visible(element) && !element.closest(".maplibregl-ctrl-attrib") && !element.classList.contains("skip-link")).flatMap(element => {
          const r = element.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.top >= innerHeight || r.bottom <= 0 || r.right <= 0 || r.left >= vw) return [];
          return r.width < 43 || r.height < 43 ? [{ label: element.getAttribute("aria-label") || element.textContent.trim().slice(0, 50), width: Math.round(r.width), height: Math.round(r.height) }] : [];
        });
        const overflow = document.documentElement.scrollWidth - vw;
        const clipping = [...document.querySelectorAll("h1,h2,h3,button,strong")].filter(visible).flatMap(element => {
          if (element.closest(".forecast-strip,.forecast-timeline,.filter-strip,.map-canvas")) return [];
          const r = element.getBoundingClientRect();
          if (r.width && (r.left < -.5 || r.right > vw + .5)) return [element.textContent.slice(0, 70)];
          return [];
        });
        return { overflow, touch, clipping };
      });
      if (result.overflow > 1 || result.touch.length || result.clipping.length) issues.push({ theme, route, width, height, ...result });
      if ((width === 390 || width === 320 || width === 1440) && (theme === "dark" || width === 390)) {
        await page.screenshot({ path: path.join(directory, theme + "-" + route.replaceAll("/", "_") + "-" + width + ".png"), fullPage: false });
      }
      checks++;
    }
    const contrast = await page.evaluate(() => {
      const rgb = value => { const parts = value.match(/[0-9.]+/g)?.map(Number); return parts && parts.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : [0,0,0,0]; };
      const blend = (fg, bg) => [0,1,2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
      const luminance = color => color.slice(0,3).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126,.7152,.0722][i], 0);
      const problems = [];
      for (const element of document.querySelectorAll("h1,h2,h3,p,span,strong,small,button,a,label")) {
        if (!element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) || element.closest(".maplibregl-control-container") || ![...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())) continue;
        const ancestors = []; let ancestor = element; let image = false;
        while (ancestor) { const style = getComputedStyle(ancestor); if (style.backgroundImage !== "none" || (ancestor.classList.contains("hero") && ancestor.querySelector(".hero-image"))) image = true; ancestors.unshift(rgb(style.backgroundColor)); ancestor = ancestor.parentElement; }
        if (image) continue;
        const background = ancestors.reduce((result, color) => blend(color, result), [255,255,255,1]);
        const style = getComputedStyle(element); const color = blend(rgb(style.color), background);
        const a = luminance(color), b = luminance(background); const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
        const min = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
        if (ratio + .05 < min) problems.push({ text: element.textContent.trim().slice(0, 55), ratio: Number(ratio.toFixed(2)), min });
      }
      return problems;
    });
    if (contrast.length) issues.push({ theme, route, contrast });
    console.log(theme, route, checks);
  }
}
await writeFile(path.join(directory, "report.json"), JSON.stringify({ checks, issues, runtimeErrors: [...runtimeErrors] }, null, 2));
console.log(JSON.stringify({ checks, issues, runtimeErrors: [...runtimeErrors], directory }, null, 2));
await browser.close();
