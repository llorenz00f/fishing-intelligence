# Database

Database target: Supabase PostgreSQL con PostGIS.

## Tables

Migrazione iniziale:

- `profiles`
- `user_preferences`
- `disciplines`
- `techniques`
- `species`
- `user_disciplines`
- `user_species`
- `spots`
- `sessions`
- `session_events`
- `catches`
- `environment_snapshots`
- `forecast_cache`
- `score_profiles`
- `score_results`
- `user_insights`
- `subscriptions`
- `alert_rules`

## Geometry

Coordinate private sono salvate come `geometry(Point, 4326)`.

## Timestamps

Tutti i timestamp persistiti sono `timestamptz`. La UI mostra formato locale.

## Seed

`supabase/seed.sql` inserisce discipline, tecniche, specie mediterranee, score profiles e un utente demo locale.
