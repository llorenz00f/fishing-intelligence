# Scoring Model

Versione corrente: `rules-v1`.

Il Fishing Score e una euristica prototipo, deterministica e spiegabile. Non e validazione scientifica e non garantisce catture.

## Input

- posizione;
- data/ora;
- disciplina;
- tecnica;
- specie target opzionale;
- snapshot meteo/marino normalizzato;
- contesto astronomico/derivato;
- storico personale opzionale.

## Base Score

Il base score e una media pesata di fattori 0-100. Ogni tecnica ha pesi propri:

- onda;
- swell;
- vento;
- temperatura mare;
- corrente;
- pressione;
- trend pressione;
- luce;
- stagione;
- profondita;
- variazione livello mare come proxy.

Se un dato manca, il fattore viene escluso e i pesi disponibili vengono rinormalizzati. Il dato mancante abbassa la confidence, non diventa zero.

## Personal Score

Il modello personale usa similarity analysis, non machine learning complesso.

Regole MVP:

- 0-9 sessioni: nessun contributo personale nello score;
- 10+ sessioni e almeno 5 sessioni simili: contributo progressivo;
- `personalWeight = min(0.65, n / (n + 25))`;
- sessioni senza catture restano nel dataset.

## Confidence

La confidence considera copertura dati, distanza temporale forecast, quantita storico e similarita media.

## Safety

`SafetyAssessment` e separato dal Fishing Score. Il sistema puo mostrare score alto e contemporaneamente warning marini. Non usa mai lo score come garanzia di sicurezza.
