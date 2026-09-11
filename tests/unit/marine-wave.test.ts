import { describe, expect, it } from "vitest";
import { waveGeometry } from "@/components/ui/MarineWave";
import { parseForecastLocation } from "@/domain/forecast/location";
import { resolvePaletteMode, themeRegistry, themeTokens } from "@/domain/appearance/registry";

describe("continuous marine waves", () => {
  it("scales with significant wave height and bounds the reserved drawing area", () => {
    const amplitudes = [0, 0.2, 0.8, 1.5, 2.5, 20].map(height => waveGeometry(height).amplitude);
    expect(amplitudes).toEqual([1, 2, 8, 15, 25, 27]);
  });
  it.each([undefined, NaN, Infinity, -1])("does not invent waves for missing/invalid height %s", height => {
    expect(waveGeometry(height)).toMatchObject({ known: false, amplitude: 0 });
  });
  it("contains two smooth repeatable tiles with the same boundary slope", () => {
    const { path } = waveGeometry(1);
    expect(path).toBe("M0 40 C30 30,60 30,90 40 C120 50,150 50,180 40 C210 30,240 30,270 40 C300 50,330 50,360 40 C390 30,420 30,450 40 C480 50,510 50,540 40 C570 30,600 30,630 40 C660 50,690 50,720 40");
  });
  it("uses a bounded provider period and a stable fallback", () => {
    expect([3, 6, 15, 30, NaN, -1].map(period => waveGeometry(1, period).period)).toEqual([4, 6, 15, 20, 8, 8]);
  });
});

describe("selected forecast location", () => {
  it("restores valid coordinates and their human-readable label", () => {
    const location = { latitude: 42.75, longitude: 10.88, label: "La mia posizione" };
    expect(parseForecastLocation(encodeURIComponent(JSON.stringify(location)))).toEqual(location);
  });
  it.each([undefined, "%broken", "null", "{}", '{"latitude":99,"longitude":0,"label":"Test"}', '{"latitude":1,"longitude":1,"label":""}'])("ignores malformed stored coordinates %s", value => {
    expect(parseForecastLocation(value)).toBeNull();
  });
});

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
describe("bright appearance palettes", () => {
  it.each(["sunset", "graphite-marine"] as const)("allows light, dark and system modes for %s", id => {
    expect(themeRegistry.find(theme => theme.id === id)?.defaultMode).toBe("light");
    expect(resolvePaletteMode(id, "system", true)).toBe("light");
    expect(resolvePaletteMode(id, "system", false)).toBe("dark");
    expect(themeTokens(id, "light")["--background"]).not.toBe(themeTokens(id, "dark")["--background"]);
  });
  it.each(themeRegistry.flatMap(theme => theme.modes.map(mode => [theme.id, mode] as const)))("retains legible text in %s %s", (id, mode) => {
    const tokens = themeTokens(id, mode);
    for (const surface of ["--background", "--surface", "--surface-solid"]) {
      expect(contrast(tokens["--foreground"], tokens[surface])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens["--muted"], tokens[surface])).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(tokens["--on-accent"], tokens["--ocean"])).toBeGreaterThanOrEqual(4.5);
  });
});
