# Work handoff

## Stato attuale

Il redesign e la correzione della mappa sono gia pubblicati su main e verificati su https://fishing-intelligence.vercel.app.

E in corso l'integrazione account reale: Supabase Auth, profili, onboarding, ruoli, beta tester, piani di test, gating premium, dati personali e sincronizzazione delle sessioni sono implementati nel codice locale. La produzione non va considerata pronta per questi flussi finche le migration e le environment variables Supabase non sono configurate.

## Ultima attivita completata

- Aggiunta migration supabase/migrations/0003_auth_beta_and_user_data.sql.
- Aggiunte route server per signup, login, recupero password, callback, profilo, piano di test, spot, sessioni ed eventi.
- Rimosso il seed con account e spot demo; il seed contiene solo cataloghi e profili di scoring.
- Isolati i dati offline per userId; nessuna route privata passa piu dati demo.
- Aggiunta documentazione in docs/AUTH_AND_PLANS.md e test SQL RLS dedicati.
- Corretto il service worker della mappa: navigazioni same-origin possono usare il fallback offline, mentre API, tile, risorse statiche e richieste RSC passano dalla rete.

## Decisioni UI

- Una sola area dominante: hero score.
- Quattro metriche essenziali in una superficie compatta.
- Dettaglio meteo completo dietro un controllo espandibile.
- Un solo insight personale in home.
- Nessuna lista forecast settimanale o elenco sessioni nella Dashboard.
- Azioni secondarie come link testuali.
- CTA primaria sempre evidente e mobile-first.

## Blocco esterno

- Configurare in Supabase le tre migration in ordine.
- Configurare in Vercel NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Configurare SUPABASE_SERVICE_ROLE_KEY solo se serve lo script admin locale; non inserirla nel client o nel repository.
- Aggiungere gli URL di callback locale e Vercel in Supabase Auth.
- Eseguire un test reale con un account confermato. Il checkout Stripe resta disattivato.

## Comandi di verifica

- npm run lint
- npm run typecheck
- npm run test:run
- npm run build
- npm run test:e2e -- tests/e2e/auth-gate.spec.ts --workers=1

Le vecchie suite E2E che aprono direttamente dashboard, diario e mappa sono fixture del precedente account demo e vanno eseguite solo dopo aver predisposto un account Supabase di test.
