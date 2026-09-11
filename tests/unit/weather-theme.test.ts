import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWeatherTheme, type AmbientEffect, type WeatherState, type WeatherTheme } from "@/domain/appearance/weather";
import type { EnvironmentSnapshot, WeatherConditions } from "@/domain/forecast/types";
import { OpenMeteoWeatherProvider } from "@/infrastructure/providers/open-meteo";
import { MockBathymetryProvider, MockMarineProvider, MockWeatherProvider } from "@/infrastructure/providers/mock";
import { ForecastService } from "@/application/services/forecast-service";

const noon = new Date("2026-09-11T12:00:00.000Z");
const astronomical: EnvironmentSnapshot["astronomical"] = {
  sunrise: "2026-09-11T05:00:00.000Z",
  sunset: "2026-09-11T18:00:00.000Z",
  isDay: true,
};
const clear: WeatherConditions = { weatherCode: 0, cloudCoverPct: 5, precipitationMm: 0, windSpeedKph: 10, windGustKph: 15 };
const neutral: WeatherTheme = {
  weatherState: "neutral", colorVariant: "neutral", ambientEffects: [], intensity: 0, timeOfDay: "unknown",
};

function resolve(weather: WeatherConditions | null = clear, at: Date = noon) {
  return resolveWeatherTheme(weather, astronomical, at);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveWeatherTheme", () => {
  const states: Array<[WeatherState, WeatherConditions | null, string, WeatherTheme["colorVariant"], readonly AmbientEffect[]]> = [
    ["neutral", null, "12:00", "neutral", []],
    ["clear-day", clear, "12:00", "day", ["sun-glow"]],
    ["clear-night", clear, "23:00", "night", ["stars"]],
    ["partly-cloudy", { weatherCode: 2 }, "12:00", "day", ["clouds"]],
    ["cloudy", { weatherCode: 3 }, "12:00", "overcast", ["clouds"]],
    ["rain", { weatherCode: 61 }, "12:00", "rain", ["clouds", "rain"]],
    ["heavy-rain", { weatherCode: 65 }, "12:00", "rain", ["clouds", "rain"]],
    ["thunderstorm", { weatherCode: 95 }, "12:00", "storm", ["clouds", "rain", "lightning"]],
    ["fog", { weatherCode: 45 }, "12:00", "mist", ["fog"]],
    ["windy", { windSpeedKph: 30 }, "12:00", "overcast", ["wind", "clouds"]],
    ["sunrise", clear, "05:00", "dawn", ["sun-glow"]],
    ["sunset", clear, "18:00", "dusk", ["sun-glow"]],
  ];

  it.each(states)("returns the complete %s contract", (state, weather, clock, colorVariant, ambientEffects) => {
    const result = resolve(weather, new Date(`2026-09-11T${clock}:00.000Z`));
    expect(result).toMatchObject({ weatherState: state, colorVariant, ambientEffects });
    expect(Object.keys(result).sort()).toEqual(["ambientEffects", "colorVariant", "intensity", "timeOfDay", "weatherState"]);
    expect(Number.isFinite(result.intensity)).toBe(true);
    expect(result.intensity).toBeGreaterThanOrEqual(0);
    expect(result.intensity).toBeLessThanOrEqual(1);
    expect(new Set(result.ambientEffects).size).toBe(result.ambientEffects.length);
  });

  const codeGroups: Array<[WeatherState, number[]]> = [
    ["clear-day", [0, 1]], ["partly-cloudy", [2]], ["cloudy", [3]],
    ["fog", [45, 48]], ["rain", [51, 53, 55, 56, 57, 61, 63, 66, 80, 81]],
    ["heavy-rain", [65, 67, 82]], ["thunderstorm", [95, 96, 99]],
  ];
  it.each(codeGroups.flatMap(([state, codes]) => codes.map((code) => [code, state] as const)))(
    "maps WMO code %i to %s without auxiliary observations", (weatherCode, state) => {
      expect(resolve({ weatherCode }).weatherState).toBe(state);
    },
  );

  it.each([71, 73, 75, 77, 85, 86])("does not misrepresent snow code %i as rain", (weatherCode) => {
    expect(resolve({ weatherCode, precipitationMm: 10 })).toMatchObject({
      weatherState: "cloudy", ambientEffects: ["clouds"],
    });
  });

  it.each([
    [0, "clear-day"], [24.99, "clear-day"], [25, "partly-cloudy"], [79.99, "partly-cloudy"], [80, "cloudy"], [100, "cloudy"],
  ] as const)("classifies %s%% cloud cover without a code as %s", (cloudCoverPct, expected) => {
    expect(resolve({ cloudCoverPct }).weatherState).toBe(expected);
  });

  it.each([
    [0, "clear-day"], [0.099, "clear-day"], [0.1, "rain"], [7.499, "rain"], [7.5, "heavy-rain"], [50, "heavy-rain"],
  ] as const)("classifies %s mm/hour precipitation as %s", (precipitationMm, expected) => {
    expect(resolve({ ...clear, precipitationMm }).weatherState).toBe(expected);
  });

  it.each([
    [29.99, 44.99, "clear-day"], [30, 0, "windy"], [0, 45, "windy"], [100, 150, "windy"],
  ] as const)("classifies sustained wind %s and gusts %s as %s", (windSpeedKph, windGustKph, expected) => {
    expect(resolve({ ...clear, windSpeedKph, windGustKph }).weatherState).toBe(expected);
  });

  it.each([
    [{ weatherCode: 95, precipitationMm: 20, windSpeedKph: 50 }, "thunderstorm"],
    [{ weatherCode: 45, precipitationMm: 8, windSpeedKph: 50 }, "heavy-rain"],
    [{ weatherCode: 45, precipitationMm: 1, windSpeedKph: 50 }, "rain"],
    [{ weatherCode: 45, windSpeedKph: 50 }, "fog"],
    [{ weatherCode: 3, windSpeedKph: 50 }, "windy"],
    [{ weatherCode: 3 }, "cloudy"],
  ] satisfies Array<[WeatherConditions, WeatherState]>)("keeps adverse weather %j visible at twilight", (weather, state) => {
    expect(resolve(weather, new Date(astronomical.sunrise))).toMatchObject({ weatherState: state, timeOfDay: "sunrise" });
    expect(resolve(weather, new Date(astronomical.sunset))).toMatchObject({ weatherState: state, timeOfDay: "sunset" });
  });

  it("keeps a rain code authoritative over zero measured rain and clear cloud cover", () => {
    expect(resolve({ ...clear, weatherCode: 65 }).weatherState).toBe("heavy-rain");
  });

  it("uses measured overcast cloud cover over a clear code", () => {
    expect(resolve({ ...clear, cloudCoverPct: 95 }).weatherState).toBe("cloudy");
  });

  it("includes clouds in partly cloudy twilight and uses night colors after sunset", () => {
    expect(resolve({ weatherCode: 2 }, new Date(astronomical.sunrise)).ambientEffects).toEqual(["sun-glow", "clouds"]);
    expect(resolve({ weatherCode: 2 }, new Date("2026-09-11T22:00Z"))).toMatchObject({
      weatherState: "partly-cloudy", colorVariant: "night", timeOfDay: "night",
    });
  });

  it.each([
    ["04:14:59.999", "clear-night", "night"], ["04:15:00.000", "sunrise", "sunrise"],
    ["05:45:00.000", "sunrise", "sunrise"], ["05:45:00.001", "clear-day", "day"],
    ["17:14:59.999", "clear-day", "day"], ["17:15:00.000", "sunset", "sunset"],
    ["18:45:00.000", "sunset", "sunset"], ["18:45:00.001", "clear-night", "night"],
  ] as const)("resolves exact twilight boundary %s", (clock, weatherState, timeOfDay) => {
    expect(resolve(clear, new Date(`2026-09-11T${clock}Z`))).toMatchObject({ weatherState, timeOfDay });
  });

  it("interprets timezone offsets as instants, independent of the machine timezone", () => {
    const offsetAstronomy = { sunrise: "2026-09-11T07:00:00+02:00", sunset: "2026-09-11T20:00:00+02:00", isDay: false };
    expect(resolveWeatherTheme(clear, offsetAstronomy, new Date("2026-09-11T07:15:00+02:00"))).toEqual(
      resolve(clear, new Date("2026-09-11T05:15Z")),
    );
  });

  it("uses actual events when now crosses the snapshot's day/night flag", () => {
    expect(resolveWeatherTheme(clear, { ...astronomical, isDay: false }, noon).weatherState).toBe("clear-day");
    expect(resolve(clear, new Date("2026-09-11T23:00Z")).weatherState).toBe("clear-night");
  });

  it.each([["05:20", "sunrise"], ["05:30", "sunrise"], ["05:40", "sunset"]] as const)(
    "selects the nearer event when twilight windows overlap at %s", (clock, expected) => {
      expect(resolveWeatherTheme(clear, { ...astronomical, sunset: "2026-09-11T06:00:00Z" }, new Date(`2026-09-11T${clock}Z`)).weatherState).toBe(expected);
    },
  );

  it("handles twilight spanning UTC midnight", () => {
    expect(resolveWeatherTheme(clear, {
      sunrise: "2026-09-11T00:15:00Z", sunset: "2026-09-11T13:00:00Z", isDay: false,
    }, new Date("2026-09-10T23:45Z")).weatherState).toBe("sunrise");
  });

  it.each([null, undefined, {}, { airTemperatureC: 20 }, { precipitationMm: 0 }, { windSpeedKph: 2 }])(
    "returns neutral for missing weather or insufficient classification data: %j", (weather) => {
      expect(resolveWeatherTheme(weather, astronomical, noon)).toEqual(neutral);
    },
  );

  it("supports a caller invalidating a stale snapshot with null", () => {
    expect(resolve(null)).toEqual(neutral);
  });

  const invalidWeather: Array<[string, unknown]> = [
    ["cloudCoverPct", -1], ["cloudCoverPct", 101], ["cloudCoverPct", NaN], ["cloudCoverPct", Infinity],
    ["cloudCoverPct", null], ["cloudCoverPct", "50"],
    ["precipitationMm", -0.1], ["precipitationMm", NaN], ["precipitationMm", Infinity], ["precipitationMm", "1"],
    ["windSpeedKph", -1], ["windSpeedKph", NaN], ["windSpeedKph", Infinity],
    ["windGustKph", -1], ["windGustKph", NaN], ["windGustKph", Infinity],
    ["weatherCode", -1], ["weatherCode", 999], ["weatherCode", 4], ["weatherCode", 2.5],
    ["weatherCode", NaN], ["weatherCode", Infinity], ["weatherCode", "95"], ["weatherCode", null],
  ];
  it.each(invalidWeather)("returns neutral for invalid %s = %s even with other valid values", (field, value) => {
    expect(resolve({ ...clear, [field]: value } as WeatherConditions)).toEqual(neutral);
  });

  it.each([
    null, undefined, { ...astronomical, sunrise: "" }, { ...astronomical, sunset: "bad" },
    { ...astronomical, sunrise: "2026-02-30T05:00:00Z" },
    { ...astronomical, sunrise: "2026-09-11T05:00:00" },
    { ...astronomical, sunrise: astronomical.sunset },
    { ...astronomical, sunset: "2026-09-11T04:00:00Z" },
    { ...astronomical, sunset: "2026-09-12T18:00:00Z" },
  ])("returns neutral for unavailable or invalid astronomical data %j", (astro) => {
    expect(resolveWeatherTheme(clear, astro, noon)).toEqual(neutral);
  });

  it("returns neutral for a malformed isDay flag", () => {
    expect(resolveWeatherTheme(clear, { ...astronomical, isDay: null } as unknown as EnvironmentSnapshot["astronomical"], noon)).toEqual(neutral);
  });

  it.each([new Date(NaN), new Date("2026-09-14T12:00Z"), new Date("2026-09-08T12:00Z")])(
    "returns neutral for invalid time or unrelated astronomical dates %s", (now) => {
      expect(resolve(clear, now)).toEqual(neutral);
    },
  );

  it("does not read the clock or mutate supplied inputs", () => {
    const weather = Object.freeze({ ...clear });
    const astro = Object.freeze({ ...astronomical });
    const now = new Date(noon);
    const clock = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Clock read"); });
    const first = resolveWeatherTheme(weather, astro, now);
    expect(resolveWeatherTheme(weather, astro, now)).toEqual(first);
    expect(clock).not.toHaveBeenCalled();
    expect(weather).toEqual(clear);
    expect(astro).toEqual(astronomical);
    expect(now.getTime()).toBe(noon.getTime());
  });

  it("does not share returned effect arrays between calls", () => {
    const result = resolve();
    (result.ambientEffects as AmbientEffect[]).push("rain");
    expect(resolve().ambientEffects).toEqual(["sun-glow"]);
  });

  it.each([{ precipitationMm: 1e300 }, { windSpeedKph: 1e300 }, { windGustKph: 1e300 }])(
    "clamps intensity for extreme finite measurements %j", (weather) => {
      expect(resolve(weather).intensity).toBe(1);
    },
  );

  it("increases rain intensity with measured precipitation", () => {
    expect(resolve({ precipitationMm: 5 }).intensity).toBeGreaterThan(resolve({ precipitationMm: 1 }).intensity);
  });

  it("does not reduce intensity when rain becomes heavy rain", () => {
    const intensity = [0.1, 1, 5, 7.499, 7.5, 10, 15, 20].map((precipitationMm) => resolve({ precipitationMm }).intensity);
    expect(intensity).toEqual([...intensity].sort((a, b) => a - b));
  });
});

const request = {
  location: { latitude: 42.76, longitude: 10.88 },
  start: "2026-09-11T00:00:00.000Z", end: "2026-09-12T23:00:00.000Z",
};

function stubWeatherResponse(response: unknown) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(response), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("weather provider integration", () => {
  it("requests weather codes, daylight and daily solar events in one existing UTC fetch", async () => {
    const fetcher = stubWeatherResponse({
      hourly: {
        time: ["2026-09-11T06:00", "2026-09-11T20:00", "2026-09-12T06:00"],
        weather_code: [2, 95, 45], is_day: [1, 0, 1], cloud_cover: [30, 100, 100],
      },
      daily: {
        time: ["2026-09-12", "2026-09-11"],
        sunrise: ["2026-09-12T04:56", "2026-09-11T04:55"],
        sunset: ["2026-09-12T18:01", "2026-09-11T18:03"],
      },
    });
    const points = await new OpenMeteoWeatherProvider().getHourlyWeather(request);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("timezone")).toBe("UTC");
    expect(url.searchParams.get("daily")).toBe("sunrise,sunset");
    expect(url.searchParams.get("hourly")?.split(",")).toEqual(expect.arrayContaining([
      "weather_code", "is_day", "cloud_cover", "precipitation", "pressure_msl", "wind_speed_10m",
    ]));
    expect(points.map((point) => point.conditions.weatherCode)).toEqual([2, 95, 45]);
    expect(points[0].astronomical).toEqual({ sunrise: "2026-09-11T04:55:00.000Z", sunset: "2026-09-11T18:03:00.000Z", isDay: true });
    expect(points[1].astronomical?.isDay).toBe(false);
    expect(points[2].astronomical?.sunrise).toBe("2026-09-12T04:56:00.000Z");
    expect(points[0].timestamp).toBe("2026-09-11T06:00:00.000Z");
    expect(resolveWeatherTheme(points[1].conditions, points[1].astronomical, new Date(points[1].timestamp)).weatherState).toBe("thunderstorm");
  });

  it("uses actual solar instants to derive daylight when is_day is absent", async () => {
    stubWeatherResponse({
      hourly: { time: ["2026-09-11T04:00:00Z", "2026-09-11T12:00:00.000Z"], weather_code: [0, 0] },
      daily: { time: ["2026-09-11"], sunrise: ["2026-09-11T05:00"], sunset: ["2026-09-11T18:00"] },
    });
    const points = await new OpenMeteoWeatherProvider().getHourlyWeather(request);
    expect(points.map((point) => point.astronomical?.isDay)).toEqual([false, true]);
  });

  it.each([undefined, { time: ["2026-09-11"], sunrise: [null], sunset: [null] },
    { time: ["2026-09-11"], sunrise: ["2026-02-30T05:00"], sunset: ["bad"] },
    { time: ["2026-09-11"], sunrise: ["2026-09-11T18:00"], sunset: ["2026-09-11T05:00"] },
    { time: ["2026-09-11"], sunrise: ["2026-09-11T05:00"], sunset: ["2026-09-12T18:00"] },
  ])("keeps missing/invalid solar events unavailable even with daylight data %j", async (daily) => {
    stubWeatherResponse({ hourly: { time: ["2026-09-11T12:00"], weather_code: [0], is_day: [1] }, daily });
    const [point] = await new OpenMeteoWeatherProvider().getHourlyWeather(request);
    expect(point.astronomical).toEqual({ sunrise: "", sunset: "", isDay: true });
    expect(resolveWeatherTheme(point.conditions, point.astronomical, noon)).toEqual(neutral);
  });

  it("keeps older provider responses usable without adding fabricated codes or astronomy", async () => {
    stubWeatherResponse({ hourly: { time: ["2026-09-11T12:00"], cloud_cover: [42] } });
    const [point] = await new OpenMeteoWeatherProvider().getHourlyWeather(request);
    expect(point.conditions.cloudCoverPct).toBe(42);
    expect(point.conditions.weatherCode).toBeUndefined();
    expect(point.astronomical).toBeUndefined();
  });

  it("ignores invalid hourly timestamps without shifting the remaining hourly data", async () => {
    stubWeatherResponse({ hourly: { time: ["bad", "2026-09-11T12:00"], weather_code: [0, 95] } });
    const points = await new OpenMeteoWeatherProvider().getHourlyWeather(request);
    expect(points).toHaveLength(1);
    expect(points[0].conditions.weatherCode).toBe(95);
  });

  it("supplies explicit synthetic astronomy and consistent rain codes in mock data", async () => {
    const points = await new MockWeatherProvider().getHourlyWeather(request);
    expect(points[0].astronomical).toEqual({ sunrise: "2026-09-11T04:42:00.000Z", sunset: "2026-09-11T17:38:00.000Z", isDay: false });
    expect(points[12].astronomical?.isDay).toBe(true);
    expect(points[0].conditions).toMatchObject({ weatherCode: 61, precipitationMm: 0.8 });
    expect(points[1].conditions).toMatchObject({ weatherCode: 2, precipitationMm: 0 });
  });
});

describe("forecast service astronomical propagation", () => {
  const input = {
    location: request.location, discipline: "SHORE_SPINNING" as const, technique: "SHORE_SPINNING" as const,
    start: noon.toISOString(), days: 1,
  };

  it("uses the provider's current rain instead of midnight or a dry future hour", async () => {
    const fetcher = stubWeatherResponse({
      current: { time: "2026-09-11T12:15", weather_code: 61, precipitation: 0.4, cloud_cover: 100, is_day: 1 },
      hourly: { time: ["2026-09-11T00:00", "2026-09-11T12:00", "2026-09-11T13:00"], weather_code: [3, 3, 0], precipitation: [0, 0, 0] },
      daily: { time: ["2026-09-11"], sunrise: ["2026-09-11T05:00"], sunset: ["2026-09-11T18:00"] },
    });
    const service = new ForecastService({ weather: new OpenMeteoWeatherProvider(), marine: {
      name: "open-meteo-marine", getHourlyMarine: async () => [{ timestamp: "2026-09-11T12:00:00.000Z", conditions: { waveHeightM: 1.2, wavePeriodSec: 6 } }],
    }, bathymetry: new MockBathymetryProvider() });
    const forecast = await service.getForecast({ ...input, start: "2026-09-11T12:20:00.000Z" });
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get("current")).toContain("precipitation");
    expect(forecast.current.timestamp).toBe("2026-09-11T12:15:00.000Z");
    expect(forecast.current.snapshot.weather).toMatchObject({ weatherCode: 61, precipitationMm: 0.4 });
    expect(forecast.current.snapshot.marine).toMatchObject({ waveHeightM: 1.2, wavePeriodSec: 6 });
    expect(forecast.days[0].hours).toHaveLength(3);
    expect(forecast.days[0].hours[2].snapshot.weather.weatherCode).toBe(0);
  });

  it("falls back to the current hour, never a distant first hour", async () => {
    stubWeatherResponse({ hourly: { time: ["2026-09-11T00:00", "2026-09-11T12:00", "2026-09-11T13:00"], weather_code: [65, 0, 95] } });
    const service = new ForecastService({ weather: new OpenMeteoWeatherProvider(), marine: { name: "empty", getHourlyMarine: async () => [] }, bathymetry: new MockBathymetryProvider() });
    const forecast = await service.getForecast({ ...input, start: "2026-09-11T12:20:00.000Z" });
    expect(forecast.current.snapshot.weather.weatherCode).toBe(0);
    const stale = await service.getForecast({ ...input, start: "2026-09-11T22:20:00.000Z" });
    expect(stale.current.snapshot.provider).toBe("fallback");
    expect(stale.current.snapshot.weather).toEqual({});
  });

  it("passes live provider solar events through to both themes and scoring offsets", async () => {
    const fetcher = stubWeatherResponse({
      hourly: { time: ["2026-09-11T12:00"], weather_code: [0], is_day: [1] },
      daily: { time: ["2026-09-11"], sunrise: ["2026-09-11T05:11"], sunset: ["2026-09-11T18:09"] },
    });
    const service = new ForecastService({
      weather: new OpenMeteoWeatherProvider(), marine: new MockMarineProvider(), bathymetry: new MockBathymetryProvider(),
    });
    const forecast = await service.getForecast(input);
    const snapshot = forecast.current.snapshot;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(snapshot.astronomical).toEqual({ sunrise: "2026-09-11T05:11:00.000Z", sunset: "2026-09-11T18:09:00.000Z", isDay: true });
    expect(snapshot.derived.minutesFromSunrise).toBe(409);
    expect(snapshot.derived.minutesToSunset).toBe(369);
    expect(snapshot.weather.weatherCode).toBe(0);
    expect(resolveWeatherTheme(snapshot.weather, snapshot.astronomical, noon).weatherState).toBe("clear-day");
    expect(Number.isFinite(forecast.current.score.finalScore)).toBe(true);
  });

  it("does not invent astronomy when a live response or marine-only hour lacks it", async () => {
    stubWeatherResponse({ hourly: { time: ["2026-09-11T12:00"], weather_code: [0] } });
    const service = new ForecastService({
      weather: new OpenMeteoWeatherProvider(), marine: new MockMarineProvider(), bathymetry: new MockBathymetryProvider(),
    });
    const forecast = await service.getForecast(input);
    for (const hour of forecast.days.flatMap((day) => day.hours)) {
      expect(hour.snapshot.astronomical).toEqual({ sunrise: "", sunset: "", isDay: false });
      expect(hour.snapshot.derived.minutesFromSunrise).toBeUndefined();
      expect(hour.snapshot.derived.minutesToSunset).toBeUndefined();
      expect(Number.isFinite(hour.score.finalScore)).toBe(true);
      expect(resolveWeatherTheme(hour.snapshot.weather, hour.snapshot.astronomical, new Date(hour.timestamp))).toEqual(neutral);
    }
  });

  it("preserves mock scoring's former synthetic twilight offsets", async () => {
    const forecast = await new ForecastService({
      weather: new MockWeatherProvider(), marine: new MockMarineProvider(), bathymetry: new MockBathymetryProvider(),
    }).getForecast(input);
    expect(forecast.current.snapshot.derived).toMatchObject({ minutesFromSunrise: 438, minutesToSunset: 338 });
    expect(forecast.current.score.finalScore).toBeGreaterThanOrEqual(0);
    expect(forecast.current.score.finalScore).toBeLessThanOrEqual(100);
  });

  it("returns an unthemed fallback when neither provider supplies hours", async () => {
    const forecast = await new ForecastService({
      weather: { name: "no-weather", getHourlyWeather: async () => [] },
      marine: { name: "no-marine", getHourlyMarine: async () => [] },
      bathymetry: new MockBathymetryProvider(),
    }).getForecast(input);
    expect(resolveWeatherTheme(forecast.current.snapshot.weather, forecast.current.snapshot.astronomical, noon)).toEqual(neutral);
    expect(forecast.current.snapshot.derived.minutesFromSunrise).toBeUndefined();
  });
});
