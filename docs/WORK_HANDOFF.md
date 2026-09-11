# Work handoff

## Stato attuale

Redesign Dashboard pubblicato. Corretto e pubblicato anche il problema della mappa visibile solo in localhost. Il progetto e su `main`; il deploy Vercel della correzione (`ae514be`) e `Ready` su `https://fishing-intelligence.vercel.app/map`.

## Ultima attivita completata

Riprodotta la mappa vuota online con il service worker attivo: la CSP del worker bloccava le richieste a OpenFreeMap (`connect-src`), che ricevevano poi HTML della Dashboard dal fallback offline invece di JSON e tile vettoriali. Senza worker la cartografia funzionava.

Il worker ora gestisce solo navigazioni GET dello stesso dominio. Mappe, API, risorse statiche e richieste RSC passano direttamente alla rete, senza allentare la CSP. Conservato il fallback per le pagine offline e aggiornato il nome della cache a `fishing-intelligence-shell-v2`.

Verificato online anche l'aggiornamento di una sessione controllata dal vecchio worker: dopo aggiornamento e ricarica la mappa funziona senza cancellare dati del browser. I nuovi test browser abilitano esplicitamente il worker e verificano i dati cartografici reali, non solo la presenza dei marker.

## Attivita ancora da fare

- Nessuna attivita aperta per la correzione della mappa.

## Decisioni UI prese

- Una sola area dominante: hero score.
- Quattro metriche essenziali in una superficie compatta.
- Dettaglio meteo completo dietro un controllo espandibile e gia presente in Forecast.
- Un solo insight personale in home.
- Nessuna lista forecast settimanale o elenco sessioni nella Dashboard.
- Azioni secondarie come link testuali, non card.
- CTA primaria sempre evidente e mobile-first.
- Dashboard a quattro superfici principali, senza duplicare forecast, diario o mappa.

## File principali

- `public/sw.js`
- `tests/unit/service-worker.test.ts`
- `tests/e2e/map-production.spec.ts`
- `src/app/(app)/dashboard/page.tsx`
- `src/components/forecast/ScoreCard.tsx`
- `src/components/ui/ConditionCards.tsx`
- `src/components/ui/FactorBreakdown.tsx`
- `src/components/app/MobileHeader.tsx`
- `src/app/globals.css`
- `docs/DASHBOARD_SIMPLIFICATION_PLAN.md`

## Bug aperti

- Mappa vuota in produzione: risolto e verificato su mobile e desktop con service worker attivo.
- La cartografia richiede una connessione: non e stato aggiunto il download di mappe offline.

## Comandi da eseguire

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run test:e2e -- --workers=1`
- `npm run build`

## Ultima verifica

- Audit visuale: completato.
- E2E Dashboard semplificata: 8 passaggi superati su 320, 360, 390, 412, 430, 768 e 1440px.
- Lint: superato.
- Typecheck: superato.
- Test unit/integration: 259 superati, inclusi 17 nuovi casi sul service worker.
- Test browser locali: 21 superati, inclusi 320/360/390/412/430/768/1440px, temi, Dynamic Weather e mappa con worker attivo.
- Build produzione: superata.
- Deploy pubblico: `Ready` su `https://fishing-intelligence.vercel.app`.
- Smoke E2E pubblico: 3 verifiche superate (Dashboard/Forecast e mappa a 390/1440px con worker attivo).
- Controllo visuale pubblico e analisi pixel della cartografia a 390/1440px: non vuota, zoom, trascinamento e cambio stile funzionanti; nessun errore nelle richieste OpenFreeMap e nessun overflow orizzontale.
- Aggiornamento da worker v1 a v2: superato in una sessione pubblica gia aperta, senza cancellare i dati del browser.
