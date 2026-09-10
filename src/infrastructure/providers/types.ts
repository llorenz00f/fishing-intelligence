import type { EnvironmentSnapshot, MarineConditions, WeatherConditions } from "@/domain/forecast/types";
import type { LocationPoint } from "@/types/product";

export type ProviderRequest = {
  location: LocationPoint;
  start: string;
  end: string;
};

export type HourlyWeatherPoint = {
  timestamp: string;
  conditions: WeatherConditions;
};

export type HourlyMarinePoint = {
  timestamp: string;
  conditions: MarineConditions;
};

export interface WeatherProvider {
  name: string;
  getHourlyWeather(request: ProviderRequest): Promise<HourlyWeatherPoint[]>;
}

export interface MarineWeatherProvider {
  name: string;
  getHourlyMarine(request: ProviderRequest): Promise<HourlyMarinePoint[]>;
}

export interface BathymetryProvider {
  name: string;
  getDepthAtLocation(location: LocationPoint): Promise<number | null>;
}

export interface GeocodingProvider {
  name: string;
  search(query: string): Promise<LocationPoint[]>;
}

export type ProviderBundle = {
  weather: WeatherProvider;
  marine: MarineWeatherProvider;
  bathymetry: BathymetryProvider;
};

export type ForecastSnapshotFactoryInput = {
  timestamp: string;
  location: LocationPoint;
  weather: WeatherConditions;
  marine: MarineConditions;
  provider: string;
  fetchedAt: string;
  forecastHorizonHours: number;
};

export type ForecastProviderResult = {
  snapshots: EnvironmentSnapshot[];
  providerLabel: string;
};
