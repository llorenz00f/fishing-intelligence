import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "@/app/api/profile/appearance/route";
import { defaultAppearancePreferences } from "@/domain/appearance/preferences";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/infrastructure/supabase/server", () => ({ createSupabaseServerClient: createClient }));

const userId = "00000000-0000-0000-0000-000000000101";
const defaultRow = {
  theme_id: "deep-ocean",
  dynamic_weather_theme_enabled: false,
  ambient_effect_intensity: "standard",
  appearance_mode: "system",
  reduced_motion: false,
};

function setupClient(plan = "FREE") {
  const profiles = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { plan, display_name: "Angler" }, error: null }),
  };
  const preferences = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: defaultRow, error: null }),
  };
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: userId, user_metadata: { plan: "CAPTAIN", display_name: "Untrusted" } } }, error: null,
  });
  const client = {
    auth: { getUser },
    from: vi.fn((table: string) => {
      if (table === "profiles") return profiles;
      if (table === "appearance_preferences") return preferences;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  createClient.mockResolvedValue(client);
  return { client, profiles, preferences, getUser };
}

function patch(value: unknown = defaultAppearancePreferences, headers: Record<string, string> = {}) {
  return PATCH(new Request("https://fishing.example/api/profile/appearance", {
    method: "PATCH", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(value),
  }));
}

beforeEach(() => vi.clearAllMocks());

describe("appearance GET", () => {
  it("reports unavailable storage when cloud configuration is absent", async () => {
    createClient.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "APPEARANCE_UNAVAILABLE", storage: "local" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([null, new AuthSessionMissingError()])("requires authentication without a user (%s)", async (error) => {
    const { getUser, client } = setupClient();
    getUser.mockResolvedValue({ data: { user: null }, error });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in to save profile appearance.", code: "UNAUTHENTICATED" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("uses verified identity and the profile plan, ignoring forged metadata", async () => {
    const { getUser, profiles, preferences } = setupClient();
    const response = await GET();
    expect(await response.json()).toEqual({
      userId, plan: "FREE", preferences: defaultAppearancePreferences, storage: "profile", displayName: "Angler",
    });
    expect(getUser).toHaveBeenCalledOnce();
    expect(profiles.eq).toHaveBeenCalledWith("id", userId);
    expect(preferences.eq).toHaveBeenCalledWith("user_id", userId);
    expect(response.headers.get("vary")).toBe("Cookie");
  });

  it("treats a missing profile as FREE", async () => {
    const { profiles } = setupClient();
    profiles.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await (await GET()).json()).toEqual({
      userId, plan: "FREE", preferences: defaultAppearancePreferences, storage: "profile", displayName: null,
    });
  });

  it("returns saved premium settings only while entitled", async () => {
    const { profiles, preferences } = setupClient("PRO");
    preferences.maybeSingle.mockResolvedValue({
      data: { ...defaultRow, theme_id: "dynamic-weather", dynamic_weather_theme_enabled: true, reduced_motion: true }, error: null,
    });
    expect((await (await GET()).json()).preferences.themeId).toBe("dynamic-weather");
    profiles.maybeSingle.mockResolvedValue({ data: { plan: "FREE" }, error: null });
    expect((await (await GET()).json()).preferences).toEqual({ ...defaultAppearancePreferences, reducedMotion: true });
    expect(preferences.upsert).not.toHaveBeenCalled();
  });

  it("isolates successive users and does not cache their plan or settings", async () => {
    const { getUser, profiles, preferences } = setupClient("CAPTAIN");
    await GET();
    getUser.mockResolvedValue({ data: { user: { id: "second-user" } }, error: null });
    profiles.maybeSingle.mockResolvedValue({ data: { plan: "FREE", display_name: "Second" }, error: null });
    expect((await (await GET()).json()).userId).toBe("second-user");
    expect(profiles.eq).toHaveBeenLastCalledWith("id", "second-user");
    expect(preferences.eq).toHaveBeenLastCalledWith("user_id", "second-user");
  });

  it.each(["profiles", "preferences"])("signals unavailable when %s cannot be read", async (table) => {
    const client = setupClient();
    client[table as "profiles" | "preferences"].maybeSingle.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database detail");
  });

  it.each([
    [new AuthApiError("Invalid JWT", 401, undefined), 401],
    [new AuthRetryableFetchError("offline", 0), 503],
  ])("fails closed on authentication errors (%s)", async (error, status) => {
    const { getUser, client } = setupClient();
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error });
    expect((await GET()).status).toBe(status);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe("appearance PATCH", () => {
  it("reports unavailable storage and refuses anonymous persistence", async () => {
    createClient.mockResolvedValue(null);
    expect((await patch()).status).toBe(503);
    const { getUser, client } = setupClient();
    getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });
    expect((await patch()).status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
  });

  it.each(["off", "reduced", "standard"])("persists FREE intensity %s, light mode and reduced motion", async (intensity) => {
    const { preferences } = setupClient();
    preferences.single.mockResolvedValue({
      data: { ...defaultRow, ambient_effect_intensity: intensity, appearance_mode: "light", reduced_motion: true }, error: null,
    });
    const value = { ...defaultAppearancePreferences, ambientEffectIntensity: intensity, appearanceMode: "light", reducedMotion: true };
    const response = await patch(value);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ preferences: value });
    expect(preferences.upsert).toHaveBeenCalledWith({
      ...defaultRow, user_id: userId, ambient_effect_intensity: intensity, appearance_mode: "light", reduced_motion: true,
    }, { onConflict: "user_id" });
  });

  it.each(["PRO", "CAPTAIN"])("persists premium settings for trusted %s profiles", async (plan) => {
    const { preferences } = setupClient(plan);
    preferences.single.mockResolvedValue({ data: { ...defaultRow, theme_id: "sunset" }, error: null });
    const value = { ...defaultAppearancePreferences, themeId: "sunset" };
    expect(await (await patch(value)).json()).toEqual({ preferences: value });
  });

  it.each([{ themeId: "sunset" }, { themeId: "dynamic-weather" }, { dynamicWeatherThemeEnabled: true }])(
    "denies FREE premium settings despite forged user metadata: %j", async (value) => {
      const { preferences } = setupClient();
      const response = await patch({ ...defaultAppearancePreferences, ...value });
      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe("PREMIUM_REQUIRED");
      expect(preferences.upsert).not.toHaveBeenCalled();
    },
  );

  it.each([null, [], {}, { reducedMotion: true }, { ...defaultAppearancePreferences, userId: "victim" },
    { ...defaultAppearancePreferences, plan: "CAPTAIN" }, { ...defaultAppearancePreferences, reducedMotion: "true" },
    { ...defaultAppearancePreferences, themeId: "unknown" },
  ])("rejects invalid or identity-bearing payload %j", async (value) => {
    const { preferences } = setupClient("PRO");
    expect((await patch(value)).status).toBe(400);
    expect(preferences.upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const { preferences } = setupClient();
    const response = await PATCH(new Request("https://fishing.example/api/profile/appearance", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: "{",
    }));
    expect(response.status).toBe(400);
    expect(preferences.upsert).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes and non-JSON requests", async () => {
    const { preferences } = setupClient();
    expect((await patch(defaultAppearancePreferences, { origin: "https://untrusted.example" })).status).toBe(403);
    expect((await patch(defaultAppearancePreferences, { "content-type": "text/plain" })).status).toBe(415);
    expect(preferences.upsert).not.toHaveBeenCalled();
  });

  it.each([["42501", 403], ["42P01", 503], ["PGRST205", 503], ["08006", 503]])(
    "does not report persistence on database error %s", async (code, status) => {
      const { preferences } = setupClient();
      preferences.single.mockResolvedValue({ data: null, error: { code, message: "private database detail" } });
      const response = await patch();
      expect(response.status).toBe(status);
      expect(await response.text()).not.toContain("private database detail");
    },
  );

  it("handles unexpected cloud failures without leaking details", async () => {
    createClient.mockRejectedValue(new Error("private connection details"));
    expect((await GET()).status).toBe(503);
    const response = await patch();
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("APPEARANCE_UNAVAILABLE");
  });
});
