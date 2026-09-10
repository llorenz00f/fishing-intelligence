import type { LocationPoint, PressureTrend } from "@/types/product";

export type WeatherConditions = {
  airTemperatureC?: number;
  pressureMslHpa?: number;
  surfacePressureHpa?: number;
  pressureTrend?: PressureTrend;
  cloudCoverPct?: number;
  precipitationMm?: number;
  windSpeedKph?: number;
  windDirectionDeg?: number;
  windGustKph?: number;
};

export type MarineConditions = {
  waveHeightM?: number;
  waveDirectionDeg?: number;
  wavePeriodSec?: number;
  swellHeightM?: number;
  swellDirectionDeg?: number;
  swellPeriodSec?: number;
  seaSurfaceTemperatureC?: number;
  oceanCurrentVelocityMps?: number;
  oceanCurrentDirectionDeg?: number;
  seaLevelHeightM?: number;
  depthM?: number;
};

export type AstronomicalContext = {
  sunrise: string;
  sunset: string;
  isDay: boolean;
  moonPhase?: number;
};

export type DerivedEnvironmentalContext = {
  month: number;
  minutesFromSunrise?: number;
  minutesToSunset?: number;
  forecastHorizonHours: number;
};

export type EnvironmentSnapshot = {
  timestamp: string;
  location: LocationPoint;
  weather: WeatherConditions;
  marine: MarineConditions;
  astronomical: AstronomicalContext;
  derived: DerivedEnvironmentalContext;
  provider: string;
  fetchedAt: string;
  missingFields: string[];
  dataCoverage: number;
};
