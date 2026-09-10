# Decision Log

## 2026-09-09 - Start in mock mode with live adapters

Decisione: la prima verticale usa `DATA_PROVIDER_MODE=mock` per essere eseguibile senza chiavi o rete, ma include adapter live Open-Meteo e adapter EMODnet predisposto.

Motivo: consente sviluppo UI/domain/test immediato senza accoppiare i componenti alla forma JSON dei provider esterni.

## 2026-09-09 - Deterministic score only

Decisione: nessun LLM calcola il Fishing Score. Lo score e una media pesata di fattori normalizzati con breakdown.

Motivo: spiegabilita, testabilita e coerenza con il requisito "no fake intelligence".

## 2026-09-09 - Safety separate from score

Decisione: `SafetyAssessment` produce warning e puo sopprimere CTA incoraggianti senza alterare il Fishing Score.

Motivo: condizioni pescabili e condizioni consigliabili non sono la stessa cosa.

## 2026-09-09 - Node 22 target

Decisione: il package dichiara Node 22+.

Motivo: le versioni correnti di Supabase raccomandano Node 22+; il build locale passa su Node 20.18 ma mostra warning di deprecazione.
