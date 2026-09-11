import { env } from "@/lib/env";
import { EmodnetBathymetryProvider } from "@/infrastructure/providers/emodnet";
import { MockBathymetryProvider, MockMarineProvider, MockWeatherProvider } from "@/infrastructure/providers/mock";
import { OpenMeteoMarineProvider, OpenMeteoWeatherProvider } from "@/infrastructure/providers/open-meteo";
import type { ProviderBundle } from "@/infrastructure/providers/types";

export function createProviderBundle({ allowMock = false }: { allowMock?: boolean } = {}): ProviderBundle {
  if (!allowMock || process.env.NODE_ENV === "production" || env.DATA_PROVIDER_MODE === "live") {
    return {
      weather: new OpenMeteoWeatherProvider(),
      marine: new OpenMeteoMarineProvider(),
      bathymetry: new EmodnetBathymetryProvider(),
    };
  }

  return {
    weather: new MockWeatherProvider(),
    marine: new MockMarineProvider(),
    bathymetry: new MockBathymetryProvider(),
  };
}
