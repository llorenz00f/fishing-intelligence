import type {
  BathymetryProvider,
  HourlyMarinePoint,
  HourlyWeatherPoint,
  MarineWeatherProvider,
  ProviderRequest,
  WeatherProvider,
} from "@/infrastructure/providers/types";
import { calculatePressureTrend } from "@/domain/forecast/pressure-trend";

function eachHour(start: string, end: string) {
  const result: string[] = [];
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  for (let cursor = startMs; cursor <= endMs; cursor += 60 * 60 * 1000) {
    result.push(new Date(cursor).toISOString());
  }
  return result;
}

export class MockWeatherProvider implements WeatherProvider {
  name = "mock-weather";

  async getHourlyWeather(request: ProviderRequest): Promise<HourlyWeatherPoint[]> {
    const hours = eachHour(request.start, request.end);
    const pressures = hours.map((timestamp, index) => 1017 + Math.sin(index / 8) * 4 - index * 0.015);

    return hours.map((timestamp, index) => {
      const date = new Date(timestamp);
      const hour = date.getUTCHours();
      const pressureWindow = pressures.slice(Math.max(0, index - 4), index + 1);
      return {
        timestamp,
        conditions: {
          airTemperatureC: 18 + Math.sin((hour - 8) / 24 * Math.PI * 2) * 4,
          pressureMslHpa: pressures[index],
          surfacePressureHpa: pressures[index] - 1.8,
          pressureTrend: calculatePressureTrend(pressureWindow),
          cloudCoverPct: Math.round(35 + Math.sin(index / 5) * 20),
          precipitationMm: index % 29 === 0 ? 0.8 : 0,
          windSpeedKph: 12 + Math.max(0, Math.sin((hour - 11) / 24 * Math.PI * 2)) * 14,
          windDirectionDeg: (310 + index * 7) % 360,
          windGustKph: 20 + Math.max(0, Math.sin((hour - 10) / 24 * Math.PI * 2)) * 18,
        },
      };
    });
  }
}

export class MockMarineProvider implements MarineWeatherProvider {
  name = "mock-marine";

  async getHourlyMarine(request: ProviderRequest): Promise<HourlyMarinePoint[]> {
    return eachHour(request.start, request.end).map((timestamp, index) => {
      const date = new Date(timestamp);
      const hour = date.getUTCHours();
      return {
        timestamp,
        conditions: {
          waveHeightM: 0.55 + Math.max(0, Math.sin((index + 4) / 10)) * 0.75,
          waveDirectionDeg: (260 + index * 3) % 360,
          wavePeriodSec: 5.2 + Math.sin(index / 6) * 1.4,
          swellHeightM: 0.35 + Math.max(0, Math.sin(index / 9)) * 0.65,
          swellDirectionDeg: (245 + index * 2) % 360,
          swellPeriodSec: 7 + Math.sin(index / 7) * 1.5,
          seaSurfaceTemperatureC: 20.3 + Math.sin((date.getUTCMonth() + 1) / 12 * Math.PI * 2) * 3,
          oceanCurrentVelocityMps: 0.12 + Math.max(0, Math.sin((hour + index) / 8)) * 0.28,
          oceanCurrentDirectionDeg: (180 + index * 4) % 360,
          seaLevelHeightM: Math.sin(index / 6) * 0.22,
          depthM: 18 + Math.sin(index / 5) * 7,
        },
      };
    });
  }
}

export class MockBathymetryProvider implements BathymetryProvider {
  name = "mock-bathymetry";

  async getDepthAtLocation() {
    return 22;
  }
}
