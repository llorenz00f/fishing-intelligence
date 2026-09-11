import { isAuthRetryableFetchError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  appearancePreferencesSchema,
  canUseTheme,
  isPremiumPlan,
  normalizeAppearancePreferences,
  type AppearancePreferences,
  type AppearanceProfileResponse,
  type SubscriptionPlan,
} from "@/domain/appearance/preferences";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { env } from "@/lib/env";

function localProfile(): AppearanceProfileResponse {
  return {
    userId: null,
    plan: env.PREMIUM_PREVIEW ? "CAPTAIN" : "FREE",
    preferences: null,
    storage: "local",
    displayName: null,
  };
}

const preferenceColumns =
  "theme_id,dynamic_weather_theme_enabled,ambient_effect_intensity,appearance_mode,reduced_motion";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

function unavailable() {
  return json({
    error: "Profile appearance storage is unavailable. Preferences can be kept locally.",
    code: "APPEARANCE_UNAVAILABLE",
    storage: "local",
  }, 503);
}

function unauthorized() {
  return json({ error: "Sign in to save profile appearance.", code: "UNAUTHENTICATED" }, 401);
}

async function authenticate() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { kind: "unconfigured" } as const;

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isAuthSessionMissingError(error)) return { kind: "anonymous" } as const;
    if (isAuthRetryableFetchError(error) || !error.status || error.status >= 500 || error.status === 429) {
      return { kind: "error", response: unavailable() } as const;
    }
    return { kind: "error", response: unauthorized() } as const;
  }
  if (!data.user) return { kind: "anonymous" } as const;

  // Only server-owned profile data determines entitlements, never user metadata.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan,display_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) return { kind: "error", response: unavailable() } as const;
  const plan: SubscriptionPlan = isPremiumPlan(profile?.plan) ? profile.plan : "FREE";
  const displayName = typeof profile?.display_name === "string" ? profile.display_name : null;
  return { kind: "authenticated", supabase, userId: data.user.id, plan, displayName } as const;
}

function fromRow(row: Record<string, unknown>) {
  return appearancePreferencesSchema.safeParse({
    themeId: row.theme_id,
    dynamicWeatherThemeEnabled: row.dynamic_weather_theme_enabled,
    ambientEffectIntensity: row.ambient_effect_intensity,
    appearanceMode: row.appearance_mode,
    reducedMotion: row.reduced_motion,
  });
}

function toRow(userId: string, preferences: AppearancePreferences) {
  return {
    user_id: userId,
    theme_id: preferences.themeId,
    dynamic_weather_theme_enabled: preferences.dynamicWeatherThemeEnabled,
    ambient_effect_intensity: preferences.ambientEffectIntensity,
    appearance_mode: preferences.appearanceMode,
    reduced_motion: preferences.reducedMotion,
  };
}

export async function GET() {
  try {
    const auth = await authenticate();
    if (auth.kind === "error") return auth.response;
    if (auth.kind !== "authenticated") return json(localProfile());

    const { data, error } = await auth.supabase
      .from("appearance_preferences")
      .select(preferenceColumns)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (error) return unavailable();
    const parsed = data ? fromRow(data) : null;
    if (parsed && !parsed.success) return unavailable();

    const result: AppearanceProfileResponse = {
      userId: auth.userId,
      plan: auth.plan,
      preferences: normalizeAppearancePreferences(parsed?.data, auth.plan),
      storage: "profile",
      displayName: auth.displayName,
    };
    return json(result);
  } catch {
    return unavailable();
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin writes are not allowed.", code: "FORBIDDEN" }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Send an application/json body.", code: "INVALID_CONTENT_TYPE" }, 415);
  }

  try {
    const auth = await authenticate();
    if (auth.kind === "error") return auth.response;
    if (auth.kind === "unconfigured") return unavailable();
    if (auth.kind === "anonymous") return unauthorized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body.", code: "INVALID_PREFERENCES" }, 400);
    }
    const parsed = appearancePreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid appearance preferences.", code: "INVALID_PREFERENCES" }, 400);
    }
    if (
      !canUseTheme(parsed.data.themeId, auth.plan) ||
      (parsed.data.dynamicWeatherThemeEnabled && !isPremiumPlan(auth.plan))
    ) {
      return json({ error: "This theme requires PRO or CAPTAIN.", code: "PREMIUM_REQUIRED" }, 403);
    }

    const { data, error } = await auth.supabase
      .from("appearance_preferences")
      .upsert(toRow(auth.userId, parsed.data), { onConflict: "user_id" })
      .select(preferenceColumns)
      .single();

    if (error?.code === "42501") {
      return json({ error: "Appearance write was not permitted. Reload your profile.", code: "FORBIDDEN" }, 403);
    }
    if (error || !data) return unavailable();
    const saved = fromRow(data);
    if (!saved.success) return unavailable();
    return json({ preferences: saved.data });
  } catch {
    return unavailable();
  }
}
