# Privacy Model

Principio: private by default.

## Private Data

Coordinate precise di spot, sessioni, eventi, catture e foto sono accessibili solo all'utente proprietario.

## RLS

Le tabelle user-owned usano policy basate su:

```sql
user_id = auth.uid()
```

`profiles` usa:

```sql
id = auth.uid()
```

## Photos

Bucket privato:

```text
catch-photos
```

Path:

```text
{userId}/{sessionId}/{uuid}
```

Le policy storage controllano che il primo segmento del path corrisponda a `auth.uid()`.

## Future Sharing

Qualsiasi condivisione futura di spot dovra essere opt-in esplicita.
