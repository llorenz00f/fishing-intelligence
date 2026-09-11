import type {
  HourlyMarinePoint,
  HourlyWeatherPoint,
  MarineWeatherProvider,
  ProviderRequest,
  WeatherProvider,
} from "@/infrastructure/providers/types";
import { calculatePressureTrend } from "@/domain/forecast/pressure-trend";
import type { AstronomicalContext } from "@/domain/forecast/types";
import { z } from "zod";

const timeoutMs = 7000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: 60 * 60 } });
    if (!response.ok) throw new Error(`Provider request failed: ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

type OpenMeteoWeatherResponse = {
  hourly?: {
    time?: string[];
    weather_code?: Array<number | null>;
    is_day?: Array<number | null>;
    temperature_2m?: number[];
    pressure_msl?: number[];
    surface_pressure?: number[];
    cloud_cover?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
  };
  daily?: {
    time?: string[];
    sunrise?: Array<string | null>;
    sunset?: Array<string | null>;
  };
};

const utcTimestamp = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.datetime({ offset: true, precision: -1 }),
]);

function providerInstant(value: string | null | undefined): string {
  if (typeof value !== "string" || !value) return "";
  // Open-Meteo omits the offset even when timezone=UTC was requested.
  const instant = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  return utcTimestamp.safeParse(instant).success ? new Date(instant).toISOString() : "";
}

type OpenMeteoMarineResponse = {
  hourly?: {
    time?: string[];
    wave_height?: number[];
    wave_direction?: number[];
    wave_period?: number[];
    swell_wave_height?: number[];
    swell_wave_direction?: number[];
    swell_wave_period?: number[];
    sea_surface_temperature?: number[];
    ocean_current_velocity?: number[];
    ocean_current_direction?: number[];
    sea_level_height_msl?: number[];
  };
};

export class OpenMeteoWeatherProvider implements WeatherProvider {
  name = "open-meteo-weather";

  async getHourlyWeather(request: ProviderRequest): Promise<HourlyWeatherPoint[]> {
    const start = request.start.slice(0, 10);
    const end = request.end.slice(0, 10);
    const params = new URLSearchParams({
      latitude: String(request.location.latitude),
      longitude: String(request.location.longitude),
      start_date: start,
      end_date: end,
      timezone: "UTC",
      wind_speed_unit: "kmh",
      daily: "sunrise,sunset",
      hourly: [
        "weather_code",
        "is_day",
        "temperature_2m",
        "pressure_msl",
        "surface_pressure",
        "cloud_cover",
        "precipitation",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
    });
    const data = await fetchJson<OpenMeteoWeatherResponse>(`https://api.open-meteo.com/v1/forecast?${params}`);
    const time = data.hourly?.time ?? [];
    const pressure = data.hourly?.pressure_msl ?? [];
    const solarByDate = new Map((data.daily?.time ?? []).map((date, index) => [date, {
      sunrise: providerInstant(data.daily?.sunrise?.[index]),
      sunset: providerInstant(data.daily?.sunset?.[index]),
    }]));

    return time.flatMap((isoLike, index): HourlyWeatherPoint[] => {
      const timestamp = providerInstant(isoLike);
      if (!timestamp) return [];
      const dailySolar = solarByDate.get(timestamp.slice(0, 10));
      const solar = dailySolar?.sunrise && dailySolar?.sunset && dailySolar.sunrise < dailySolar.sunset &&
        Date.parse(dailySolar.sunset) - Date.parse(dailySolar.sunrise) < 24 * 60 * 60 * 1000
        ? dailySolar
        : undefined;
      const isDay = data.hourly?.is_day?.[index];
      const astronomical: AstronomicalContext | undefined = solar || isDay === 0 || isDay === 1
        ? {
          sunrise: solar?.sunrise ?? "",
          sunset: solar?.sunset ?? "",
          isDay: isDay === 0 || isDay === 1 ? isDay === 1 : Boolean(solar && timestamp >= solar.sunrise && timestamp <= solar.sunset),
        }
        : undefined;
      return [{
        timestamp,
        astronomical,
        conditions: {
          weatherCode: data.hourly?.weather_code?.[index] ?? undefined,
          airTemperatureC: data.hourly?.temperature_2m?.[index],
          pressureMslHpa: pressure[index],
          surfacePressureHpa: data.hourly?.surface_pressure?.[index],
          pressureTrend: calculatePressureTrend(pressure.slice(Math.max(0, index - 4), index + 1)),
          cloudCoverPct: data.hourly?.cloud_cover?.[index],
          precipitationMm: data.hourly?.precipitation?.[index],
          windSpeedKph: data.hourly?.wind_speed_10m?.[index],
          windDirectionDeg: data.hourly?.wind_direction_10m?.[index],
          windGustKph: data.hourly?.wind_gusts_10m?.[index],
        },
      }];
    });
  }
}

export class OpenMeteoMarineProvider implements MarineWeatherProvider {
  name = "open-meteo-marine";

  async getHourlyMarine(request: ProviderRequest): Promise<HourlyMarinePoint[]> {
    const start = request.start.slice(0, 10);
    const end = request.end.slice(0, 10);
    const params = new URLSearchParams({
      latitude: String(request.location.latitude),
      longitude: String(request.location.longitude),
      start_date: start,
      end_date: end,
      timezone: "UTC",
      hourly: [
        "wave_height",
        "wave_direction",
        "wave_period",
        "swell_wave_height",
        "swell_wave_direction",
        "swell_wave_period",
        "sea_surface_temperature",
        "ocean_current_velocity",
        "ocean_current_direction",
        "sea_level_height_msl",
      ].join(","),
    });
    const data = await fetchJson<OpenMeteoMarineResponse>(`https://marine-api.open-meteo.com/v1/marine?${params}`);
    const time = data.hourly?.time ?? [];
    return time.map((isoLike, index) => ({
      timestamp: `${isoLike}:00.000Z`,
      conditions: {
        waveHeightM: data.hourly?.wave_height?.[index],
        waveDirectionDeg: data.hourly?.wave_direction?.[index],
        wavePeriodSec: data.hourly?.wave_period?.[index],
        swellHeightM: data.hourly?.swell_wave_height?.[index],
        swellDirectionDeg: data.hourly?.swell_wave_direction?.[index],
        swellPeriodSec: data.hourly?.swell_wave_period?.[index],
        seaSurfaceTemperatureC: data.hourly?.sea_surface_temperature?.[index],
        oceanCurrentVelocityMps: data.hourly?.ocean_current_velocity?.[index],
        oceanCurrentDirectionDeg: data.hourly?.ocean_current_direction?.[index],
        seaLevelHeightM: data.hourly?.sea_level_height_msl?.[index],
      },
    }));
  }
}
