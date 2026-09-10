# Architecture

Fishing Intelligence segue una separazione domain-first:

UI -> application services -> domain -> infrastructure.

## Layers

- `src/app`: route Next.js App Router, route handlers e layout.
- `src/components`: componenti UI riusabili e client-only quando servono browser API.
- `src/domain`: scoring, forecast primitives, personalizzazione e session model in TypeScript puro.
- `src/application/services`: orchestrazione dei casi d'uso. `ForecastService` recupera provider, normalizza snapshot, calcola score e ViewModel.
- `src/infrastructure`: Supabase, provider esterni, repositories e tile provider mappe.
- `supabase`: migrations, seed e test RLS.

## Current Vertical

La V0.1/V0.2 iniziale include una verticale demo end-to-end in mock mode:

1. mock providers generano dati meteo/marini deterministici;
2. `ForecastService` produce snapshot normalizzati;
3. `calculateFishingScore` produce score e spiegazioni;
4. dashboard/forecast/sessioni/insights consumano ViewModel e dati demo;
5. Supabase schema e RLS sono pronti per sostituire i repository mock.

## Future Replacements

I provider live possono essere sostituiti senza cambiare componenti React. Repository Supabase reali possono rimpiazzare i repository mock mantenendo i DTO dominio.
