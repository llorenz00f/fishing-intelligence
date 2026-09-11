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

`DATA_PROVIDER_MODE=live` e il default. Usare esplicitamente `mock` solo per dati dimostrativi. In caso di fallimento parziale, `ForecastService` continua con i dati disponibili e abbassa la confidence; non sostituisce il meteo reale con quello mock.

Il meteo corrente usa il blocco `current` di Open-Meteo, separato dalla previsione oraria. Se assente, si usa solo un'ora entro 90 minuti dalla richiesta. La cache provider dura 5 minuti, la dashboard si aggiorna ogni 10 minuti e al ritorno in primo piano. Le condizioni sono stime del modello, non osservazioni da un pluviometro sul posto.

Dashboard e previsioni condividono la posizione nel cookie `fi-forecast-location` del dispositivo (30 giorni). Il GPS richiede il consenso del browser; in alternativa si possono inserire coordinate. Gli effetti ambientali usano esclusivamente il meteo corrente della posizione selezionata, mai un'ora futura o dati mock/scaduti.
