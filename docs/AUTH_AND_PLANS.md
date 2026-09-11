# Auth, account e piani

## Lifecycle dell'account

La registrazione usa Supabase Auth con email e password. Il trigger `on_auth_user_created` crea una riga in `public.profiles` con `role = user`, `plan = FREE` e `is_beta_tester` letto dalla scelta fatta nel form. Se la conferma email e attiva, il link porta a `/auth/callback` e poi a `/onboarding`.

Le route sotto `dashboard`, `forecast`, `map`, `sessions`, `insights`, `assistant`, `profile` e `onboarding` richiedono una sessione valida. Le API verificano nuovamente l'utente sul server e non si fidano di valori inviati dal client.

## Profilo e ruoli

`public.profiles` contiene `display_name`, `role`, `is_beta_tester`, `plan`, `home_coordinates`, preferenze unita e stato onboarding. I ruoli supportati sono `user` e `admin`.

Ruolo e flag beta non sono modificabili dall'utente autenticato. Un account standard non puo cambiare il proprio piano. Admin e beta tester possono usare il selettore `Piano di test` per passare tra `FREE`, `PRO` e `CAPTAIN`; la modifica e salvata sul profilo.

## Feature gating

I controlli sono centralizzati in `src/domain/account/access.ts` tramite `canUseFeature` e `canSwitchTestPlan`.

- `FREE`: solo `deep-ocean`, Dynamic Weather disattivo, massimo 5 spot, previsioni base e diario.
- `PRO`: tutte le palette, Dynamic Weather, spot illimitati, previsioni estese e insights avanzati.
- `CAPTAIN`: stesse feature premium, con il piano completo disponibile per i test.

La palette `deep-ocean` e l'unica gratuita. Le altre palette restano visibili in `Profilo > Aspetto`, ma mostrano lucchetto, badge PRO e upsell. Il server applica lo stesso limite tramite API, trigger e RLS.

## Dati personali

Dashboard, diario, mappa, sessioni live e insights leggono soltanto le tabelle user-owned. I dati dimostrativi non vengono piu passati alle route private. Un account nuovo vede empty state reali e riceve solo dati meteo/marini dai provider configurati. Se un provider non risponde, l'interfaccia mostra `Dato non disponibile`.

Le sessioni iniziate vengono create in `public.sessions`; gli eventi vengono sincronizzati con la funzione `record_session_events`, che controlla ownership, finestra temporale e idempotenza. Il fallback offline locale e prefissato con l'id dell'utente.

## Database e setup

Applicare in ordine `supabase/migrations/0001_initial_schema.sql`, `0002_appearance_preferences.sql` e `0003_auth_beta_and_user_data.sql` al progetto Supabase. La migration aggiunge ruoli, beta, coordinate, trigger di protezione, funzioni di update profilo, limiti spot, ownership composita e sincronizzazione eventi.

In Vercel configurare soltanto variabili server/client necessarie, mai il file `.env`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` solo se serve a operazioni server amministrative, mai nel client
- `DATA_PROVIDER_MODE=live`

Per creare l'admin di sviluppo, usare solo in locale `DEV_ADMIN_ENABLE=true`, `DEV_ADMIN_EMAIL` e `DEV_ADMIN_PASSWORD`, poi eseguire `npm run seed:dev-admin`. Lo script rifiuta l'ambiente production e non contiene credenziali.

## Avvio del progetto

1. Creare un progetto Supabase e applicare le tre migration in ordine dal SQL Editor.
2. In Authentication > URL Configuration aggiungere l'URL locale e https://fishing-intelligence.vercel.app/auth/callback.
3. Inserire URL, anon key e, solo per lo script admin locale, service role key nelle variabili dell'ambiente.
4. Impostare DATA_PROVIDER_MODE=live e verificare registrazione, conferma email, onboarding e accesso.

Il checkout e la fatturazione non sono ancora collegati: BILLING_ENABLED=false resta intenzionale. Il cambio piano disponibile nel profilo e solo una modalita di test per admin e beta tester, non un pagamento reale.
