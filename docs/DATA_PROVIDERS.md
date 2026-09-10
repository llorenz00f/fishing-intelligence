# Data Providers

Provider directory: `src/infrastructure/providers`.

## Weather

- Interface: `WeatherProvider`
- Mock: `MockWeatherProvider`
- Live: `OpenMeteoWeatherProvider`

Open-Meteo non richiede chiave per l'MVP. `OPEN_METEO_API_KEY` resta opzionale per futuri piani/provider.

## Marine

- Interface: `MarineWeatherProvider`
- Mock: `MockMarineProvider`
- Live: `OpenMeteoMarineProvider`

La normalizzazione converte il JSON del provider in DTO interni. I componenti non leggono mai direttamente JSON Open-Meteo.

## Bathymetry

- Interface: `BathymetryProvider`
- Mock: `MockBathymetryProvider`
- Live placeholder reale: `EmodnetBathymetryProvider`

EMODnet e predisposto come adapter. Il metodo `getDepthAtLocation` torna `null` finche non viene collegato un endpoint affidabile. La batimetria non viene presentata come informazione di navigazione.

## Fallback

`DATA_PROVIDER_MODE=mock|live` sceglie il bundle provider. In caso di fallimento parziale, `ForecastService` continua con i dati disponibili e abbassa la confidence.
