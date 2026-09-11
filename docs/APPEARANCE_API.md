# Appearance persistence

`/api/profile/appearance` uses the existing Supabase server client and validates the
session with `auth.getUser()`. It reads the plan and display name from `profiles`.
User metadata, request bodies and browser storage never grant paid access.
All responses use `Cache-Control: private, no-store` and `Vary: Cookie`.

## Contract

GET without Supabase configuration or a signed-in user returns HTTP 200:

```json
{"userId":null,"plan":"FREE","preferences":null,"storage":"local","displayName":null}
```

Authenticated GET returns HTTP 200:

```json
{
  "userId": "verified-user-uuid",
  "plan": "FREE",
  "preferences": {
    "themeId": "deep-ocean",
    "dynamicWeatherThemeEnabled": false,
    "ambientEffectIntensity": "standard",
    "appearanceMode": "system",
    "reducedMotion": false
  },
  "storage": "profile",
  "displayName": null
}
```

The shown preferences are the defaults when no appearance row exists. A missing
profile is treated as FREE, with a null display name. GET does not create rows.

PATCH takes that complete five-field preferences object directly, with
`Content-Type: application/json`, and returns HTTP 200 `{ "preferences": { ... } }`
only after the database confirms the write. Partial objects, unknown keys,
unknown enum values, null fields and coerced booleans are rejected. Do not include
`userId`, `plan`, or a `preferences` wrapper in the request body.
PATCH replaces all five preferences; concurrent successful saves are last-write-wins.
Browser writes must use the same origin. Authentication uses Supabase cookies.

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_PREFERENCES` | Invalid JSON or preference schema |
| 401 | `UNAUTHENTICATED` | Invalid session, or anonymous PATCH |
| 403 | `PREMIUM_REQUIRED` | Current plan cannot use the requested theme/dynamic weather |
| 403 | `FORBIDDEN` | Cross-origin request or database denied the write; refresh the profile |
| 415 | `INVALID_CONTENT_TYPE` | PATCH requires JSON |
| 503 | `APPEARANCE_UNAVAILABLE` | PATCH without cloud configuration, or auth/database outage or missing migration |

503 includes `storage: "local"` and never reports a successful cloud save. An
unavailable GET does not identify an authenticated user as an anonymous user.
The caller should preserve its local settings on errors, and scope any signed-in
local cache to the verified user ID. A GET with `preferences: null` leaves the
guest's local preferences in control.

## Preferences and entitlements

| Field | Values | FREE access |
| --- | --- | --- |
| `themeId` | `deep-ocean`, `mediterranean-light`, `sunset`, `graphite-marine`, `abyss`, `dynamic-weather` | `deep-ocean` |
| `dynamicWeatherThemeEnabled` | boolean | `false` |
| `ambientEffectIntensity` | `off`, `reduced`, `standard` | All |
| `appearanceMode` | `system`, `dark`, `light` | All |
| `reducedMotion` | boolean | Both |

PRO and CAPTAIN allow every value. Theme selection and dynamic-weather enablement
are separate preferences, both paid when applicable. Accessibility preferences
remain independent of themes. A plan downgrade clamps the effective GET theme to
`deep-ocean` and dynamic weather to false, preserving mode, intensity and reduced
motion. Stored paid choices remain until the next save, so upgrading again can
restore them. Database policies still prohibit new paid writes after downgrade.

## Shared exports

`src/domain/appearance/preferences.ts` exports:

- Types: `ThemeId`, `AmbientEffectIntensity`, `AppearanceMode`, `AppearancePreferences`, `AppearanceProfileResponse`, `SubscriptionPlan`.
- Constants: `THEME_IDS`, `AMBIENT_EFFECT_INTENSITIES`, `APPEARANCE_MODES`.
- Frozen defaults: `defaultAppearancePreferences` and `DEFAULT_APPEARANCE_PREFERENCES` (same object).
- Strict complete-write validator: `appearancePreferencesSchema`.
- Entitlements: `canUsePremiumAppearance(plan)` and `isPremiumPlan(plan)` (same function), `canUseTheme(themeId, plan)`.
- Stored-value recovery: `normalizeAppearancePreferences(value, plan = "FREE")`.

Pass the verified server plan as the second normalization argument to retain paid
settings. The default is FREE. Normalization creates a new object, recovers invalid
stored fields independently and preserves valid accessibility choices. PATCH uses
the strict validator and explicitly rejects forbidden choices rather than normalizing them.

## Migration and verification

Apply `supabase/migrations/0002_appearance_preferences.sql` after `0001_initial_schema.sql`.
It adds `appearance_preferences` keyed by `auth.users.id`, enumerated field checks,
timestamps and owner-only RLS. The insert/update policies check paid entitlements
against `profiles.plan`; authenticated clients can read or delete only their own row.
The existing `user_preferences` table, its JSON settings and profile columns are preserved.

The profile trigger rejects client insertion of a paid plan and changes to an
existing plan, including upserts. It uses the executing database role, not mutable
JWT metadata. Ordinary profile field updates still work. Trusted database/billing
roles can manage plans. Existing plan values are preserved by the migration.
The appearance endpoint needs only the public Supabase URL and anonymous key,
with the user's validated session; it does not need a service-role key.

Focused application checks:

```sh
npm exec -- vitest run tests/unit/appearance-preferences.test.ts tests/integration/appearance-route.test.ts
```

Run `supabase/tests/rls_appearance.sql` as the administrator against a disposable
Supabase database with both migrations applied. It exercises real authenticated,
anonymous and service-role database permissions, and rolls back all test fixtures.
It requires no pgTAP extension. SQL exceptions indicate a failed check.
