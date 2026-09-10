import { describe, expect, it } from "vitest";
import { ForecastService } from "@/application/services/forecast-service";
import { MockBathymetryProvider, MockMarineProvider, MockWeatherProvider } from "@/infrastructure/providers/mock";

describe("ForecastService", () => {
  it("returns hourly scores and a best window with mock providers", async () => {
    const service = new ForecastService({
      weather: new MockWeatherProvider(),
      marine: new MockMarineProvider(),
      bathymetry: new MockBathymetryProvider(),
    });
    const forecast = await service.getForecast({
      location: { latitude: 42.76, longitude: 10.88, label: "Test" },
      discipline: "SHORE_SPINNING",
      technique: "SHORE_SPINNING",
      species: "SPIGOLA",
      start: "2026-11-12T00:00:00.000Z",
      days: 2,
    });

    expect(forecast.days.length).toBeGreaterThan(0);
    expect(forecast.current.score.finalScore).toBeGreaterThanOrEqual(0);
    expect(forecast.bestWindow).not.toBeNull();
  });

  it("survives a partial provider failure", async () => {
    const service = new ForecastService({
      weather: {
        name: "broken-weather",
        async getHourlyWeather() {
          throw new Error("timeout");
        },
      },
      marine: new MockMarineProvider(),
      bathymetry: new MockBathymetryProvider(),
    });
    const forecast = await service.getForecast({
      location: { latitude: 42.76, longitude: 10.88, label: "Test" },
      discipline: "SURFCASTING",
      technique: "STANDARD_SURFCASTING",
      species: "ORATA",
      start: "2026-06-12T00:00:00.000Z",
      days: 1,
    });

    expect(forecast.current.score.dataCoverage).toBeLessThan(100);
    expect(forecast.current.score.missingFactors.length).toBeGreaterThan(0);
  });
});
