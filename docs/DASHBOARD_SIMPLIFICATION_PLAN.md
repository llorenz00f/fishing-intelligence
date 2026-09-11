# Dashboard simplification plan

## Obiettivo

Trasformare la Dashboard in una home mobile-first che risponda rapidamente a tre domande: come sono le condizioni oggi, quando conviene andare e cosa merita attenzione. Il dettaglio resta disponibile in Forecast, Insights, Mappa e Sessioni.

## Audit iniziale

- La prima viewport distribuiva lo stesso peso visivo tra hero, meteo completo, breakdown dello score, prossimi giorni, banner Mappa, insight e sessioni recenti.
- La Dashboard mostrava 10 superfici/card informative, con duplicazioni rispetto a Forecast, Insights, Mappa e Sessioni.
- `ConditionCards` mostrava 6-8 valori insieme, oltre a alba/tramonto e grafica onde; utile in Forecast ma troppo denso per la home.
- Il breakdown dello score era già disponibile in Forecast e aggiungeva testo tecnico sotto la Dashboard.
- Su mobile il CTA restava visibile, ma solo dopo una lunga sequenza di dettagli; il contenuto prioritario non era abbastanza distinto.
- Su desktop la colonna laterale riuniva forecast settimanale, spot e diario, facendo sembrare la home un aggregatore di moduli.

## Struttura target

1. Hero principale: località, score, giudizio, tecnica/specie, finestra migliore e `Inizia sessione`.
2. Condizioni essenziali: una sola superficie compatta con Vento, Onda, SST e Pressione/Corrente.
3. Prossima occasione: un solo richiamo alla finestra migliore con score e link a Forecast.
4. Insight personale: una sola anteprima con link a Insights.
5. Azioni secondarie: link testuali verso Forecast, Mappa e Sessioni, senza nuove card.

## Cosa rimane, cosa cambia

- Rimane: `ScoreHero`, posizione/meteo corrente, accesso a `Inizia sessione`, insight personale e accesso alle sezioni principali.
- Viene fuso: il meteo completo diventa `EssentialConditions`; il dettaglio resta nel componente completo di Forecast.
- Viene spostato: timeline, giorni successivi, breakdown score, spot e diario restano nelle rispettive sezioni.
- Viene eliminato dalla vista principale: lista dei prossimi giorni, banner Mappa e due card del diario.

## Componenti da modificare

- `[x]` `src/app/(app)/dashboard/page.tsx`: riduzione della composizione e nuova gerarchia.
- `[x]` `src/components/ui/EssentialConditions.tsx`: strip compatta con dettaglio progressivo.
- `[x]` `src/components/dashboard/DashboardSectionLinks.tsx`: accessi secondari compatti verso le sezioni dedicate.
- `[x]` `src/app/globals.css`: spacing e responsive dedicati alla Dashboard semplificata.
- `[ ]` `tests/e2e/dashboard-simplification.spec.ts`: verifica mobile, desktop e progressive disclosure.

## Componenti da eliminare o consolidare dalla Dashboard

- `[x]` Rimossi dalla composizione Dashboard: `ScoreTrend`, `WindowCountdown`, `FactorBreakdown`, `SessionCard`, griglia giorni e banner Mappa.
- `[x]` Consolidato il blocco condizioni in `EssentialConditions`.
- `[x]` Consolidati gli accessi secondari in `DashboardSectionLinks`.

## Step operativi

- `[x]` Audit visuale e inventario delle superfici attuali.
- `[x]` Piano e handoff iniziali nel repository.
- `[x]` Gerarchia: hero e CTA primaria al primo livello.
- `[x]` Riduzione contenuti e consolidamento condizioni.
- `[x]` Progressive disclosure per i dettagli meteo.
- `[x]` Responsive mobile-first e spacing desktop.
- `[x]` Accessibilità, link di sezione e stati di dettaglio.
- `[x]` Quality check a 320, 360, 390, 412, 430, tablet e desktop.
- `[x]` Lint, typecheck, test pertinenti e build dopo l’implementazione.
- `[ ]` Pubblicazione su `main` e verifica del deploy pubblico.

## Ultimo aggiornamento

Macro-step completato: implementazione della Dashboard semplificata e prima verifica responsive.

- File aggiunti: questo piano, `docs/WORK_HANDOFF.md`, `src/components/ui/EssentialConditions.tsx`, `src/components/dashboard/DashboardSectionLinks.tsx` e il test E2E dedicato.
- Verificato: nessun overflow, CTA libera dalla navigazione mobile, dettaglio condizioni progressivo, 4 superfici principali invece di 10.
- Verificato: lint, typecheck, 242 test unit/integration, 19 test browser e build di produzione superati.
- Prossimo step: pubblicare su `main` e verificare il deploy pubblico.
