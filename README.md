# Fishing Intelligence

Fishing Intelligence e una webapp SaaS mobile-first per trasformare mare, meteo, tecnica, specie e storico personale in forecast spiegabili per la pesca nel Mediterraneo.

La V0.1 contiene gia una verticale funzionante: landing pubblica, auth Supabase predisposta, onboarding, dashboard, forecast 7 giorni, MapLibre, session logging offline-first, storico, insights data-driven, motore di scoring deterministico, Supabase migrations/RLS, seed e test.

## Prerequisites

- Node.js 22 o superiore consigliato. Con Node 20.18 il build passa, ma Supabase segnala deprecazione futura.
- npm 11+
- Supabase CLI per database locale e test RLS.

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preview locale: http://localhost:3000

## Environment

`DATA_PROVIDER_MODE=mock` permette di sviluppare senza servizi esterni. `DATA_PROVIDER_MODE=live` usa gli adapter Open-Meteo per meteo e mare.

Variabili principali:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la vecchia `NEXT_PUBLIC_SUPABASE_ANON_KEY` resta supportata)
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATA_PROVIDER_MODE=live|mock`
- `OPEN_METEO_API_KEY` opzionale
- `BILLING_ENABLED=false`
- `STRIPE_SECRET_KEY` opzionale
- `NEXT_PUBLIC_MAP_TILE_STYLE`

## Supabase

Le migrations sono in `supabase/migrations`. Lo schema usa PostgreSQL, PostGIS, Supabase Auth, RLS e storage privato `catch-photos`.

```bash
supabase start
supabase db reset
```

Seed reference/demo: `supabase/seed.sql`.

RLS test iniziale: `supabase/tests/rls_spots.sql`.

## Scripts

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
```

Lo smoke E2E usa Chrome locale tramite Playwright. Se Chrome non e installato, esegui `npx playwright install chromium` e rimuovi il canale Chrome dalla config se preferisci il browser gestito da Playwright.

## Architecture

Flusso principale:

UI -> application services -> domain -> infrastructure.

Il dominio scoring non importa React, Next.js, fetch o Supabase. Lo score e deterministico, versionato (`rules-v1`) e produce breakdown, missing factors, confidence e safety warnings.

## Mock And Live Providers

Provider presenti:

- `MockWeatherProvider`
- `MockMarineProvider`
- `OpenMeteoWeatherProvider`
- `OpenMeteoMarineProvider`
- `MockBathymetryProvider`
- `EmodnetBathymetryProvider`

Se un provider fallisce, `ForecastService` usa i dati disponibili e lo score rinormalizza i pesi invece di assegnare zero ai fattori mancanti.

## Security

- Nessuna service role key viene usata lato client.
- Le tabelle user-owned applicano RLS owner-only.
- Coordinate di spot, sessioni e catture sono private.
- Foto catture nel bucket privato `catch-photos`, path `{userId}/{sessionId}/{uuid}`.
- Gli endpoint API usano Zod per validare input.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/SCORING_MODEL.md`
- `docs/DATA_PROVIDERS.md`
- `docs/DATABASE.md`
- `docs/PRIVACY_MODEL.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
