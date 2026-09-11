"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ForecastViewModel } from "@/application/services/forecast-service";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";
import { defaultAppearancePreferences, normalizeAppearancePreferences, canUsePremiumAppearance, type AppearancePreferences } from "@/domain/appearance/preferences";
import { paletteTokens, resolvePaletteMode, weatherPalette, type PaletteMode } from "@/domain/appearance/registry";
import { resolveWeatherTheme, type WeatherTheme } from "@/domain/appearance/weather";
import type { SubscriptionPlan } from "@/types/product";

type Profile = { userId: string | null; displayName?: string | null; plan: SubscriptionPlan; storage: "profile" | "local" };
type SaveStatus = "idle" | "saving" | "saved" | "local" | "error";
type AppearanceContext = {
  preferences: AppearancePreferences; profile: Profile; loading: boolean; status: SaveStatus;
  mode: PaletteMode; reducedMotion: boolean; systemReducedMotion: boolean; weather: WeatherTheme;
  weatherLocation?: string; weatherSource?: string;
  updatePreferences: (patch: Partial<AppearancePreferences>) => boolean;
  publishForecast: (forecast: ForecastViewModel) => void;
  refreshProfile: () => Promise<void>;
};
const Context = createContext<AppearanceContext | null>(null);
const guest: Profile = { userId: null, plan: "FREE", storage: "local" };
const cacheKey = (userId: string | null) => `fi:appearance:${userId ?? "guest"}`;

function readCache(userId: string | null, reduced: boolean, plan: SubscriptionPlan = "FREE"): AppearancePreferences {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (raw) return normalizeAppearancePreferences(JSON.parse(raw), plan);
    const legacy = !userId ? localStorage.getItem("fishing-theme") : null;
    return { ...defaultAppearancePreferences, ambientEffectIntensity: reduced ? "reduced" : "standard", appearanceMode: legacy === "light" ? "light" : "dark" };
  } catch { return { ...defaultAppearancePreferences, ambientEffectIntensity: reduced ? "reduced" : "standard" }; }
}
function writeCache(userId: string | null, preferences: AppearancePreferences) {
  try { localStorage.setItem(cacheKey(userId), JSON.stringify(preferences)); } catch { /* Storage can be unavailable in private browsing. */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultAppearancePreferences);
  const [profile, setProfile] = useState<Profile>(guest);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [systemLight, setSystemLight] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [forecast, setForecast] = useState<ForecastViewModel | null>(null);
  const [now, setNow] = useState(0);
  const generation = useRef(0);
  const revision = useRef(0);
  const saved = useRef(defaultAppearancePreferences);
  const currentPreferences = useRef(preferences);
  const currentProfile = useRef(profile);
  const writeQueue = useRef(Promise.resolve());
  const savesPending = useRef(0);

  const refreshProfile = useCallback(async () => {
    if (savesPending.current) return;
    const request = ++generation.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const response = await fetch("/api/profile/appearance", { cache: "no-store" });
      if (!response.ok) throw new Error("profile");
      const data = await response.json() as Profile & { preferences?: AppearancePreferences | null };
      if (request !== generation.current) return;
      const nextProfile: Profile = { userId: data.userId, plan: data.plan, displayName: data.displayName, storage: data.storage };
      const cached = readCache(data.userId, reduced, data.plan);
      let next = data.preferences ? normalizeAppearancePreferences(data.preferences, data.plan) : cached;
      if (!canUsePremiumAppearance(data.plan)) next = { ...next, themeId: "deep-ocean", dynamicWeatherThemeEnabled: false };
      currentProfile.current = nextProfile;
      currentPreferences.current = saved.current = next;
      setProfile(nextProfile); setPreferences(next); setLoading(false);
      writeCache(data.userId, next);
    } catch {
      if (request !== generation.current) return;
      if (!currentProfile.current.userId) {
        const next = { ...readCache(null, reduced, currentProfile.current.plan), themeId: "deep-ocean" as const, dynamicWeatherThemeEnabled: false };
        currentPreferences.current = saved.current = next;
        setPreferences(next);
      }
      setLoading(false);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const light = matchMedia("(prefers-color-scheme: light)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMedia = () => { setSystemLight(light.matches); setSystemReducedMotion(reduced.matches); };
    const init = window.setTimeout(() => {
      syncMedia(); setNow(Date.now());
      const cached = { ...readCache(null, reduced.matches), themeId: "deep-ocean" as const, dynamicWeatherThemeEnabled: false };
      currentPreferences.current = saved.current = cached; setPreferences(cached);
      void refreshProfile();
    }, 0);
    light.addEventListener("change", syncMedia); reduced.addEventListener("change", syncMedia);
    const client = createSupabaseBrowserClient();
    const { data: auth } = client?.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        generation.current++; revision.current++;
        currentProfile.current = guest; setProfile(guest); setLoading(true);
        const local = { ...readCache(null, reduced.matches), themeId: "deep-ocean" as const, dynamicWeatherThemeEnabled: false };
        currentPreferences.current = saved.current = local; setPreferences(local); setStatus("idle");
      }
      window.setTimeout(() => void refreshProfile(), 0);
    }) ?? { data: null };
    const onFocus = () => { setNow(Date.now()); void refreshProfile(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    const onStorage = (event: StorageEvent) => { if (event.key === cacheKey(currentProfile.current.userId)) void refreshProfile(); };
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(init); auth?.subscription.unsubscribe();
      light.removeEventListener("change", syncMedia); reduced.removeEventListener("change", syncMedia);
      window.removeEventListener("focus", onFocus); window.removeEventListener("online", onFocus); window.removeEventListener("storage", onStorage);
    };
  }, [refreshProfile]);

  const dynamic = preferences.themeId === "dynamic-weather" && preferences.dynamicWeatherThemeEnabled && canUsePremiumAppearance(profile.plan);
  useEffect(() => {
    if (!dynamic) return;
    const tick = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [dynamic]);

  const weather = useMemo(() => {
    if (!dynamic || !forecast || !now || now - Date.parse(forecast.generatedAt) > 6 * 60 * 60_000) return resolveWeatherTheme(null, null, new Date(now));
    const hours = [forecast.current, ...forecast.days.flatMap(day => day.hours)];
    const closest = hours.reduce((best, hour) => Math.abs(Date.parse(hour.timestamp) - now) < Math.abs(Date.parse(best.timestamp) - now) ? hour : best);
    if (Math.abs(Date.parse(closest.timestamp) - now) > 90 * 60_000) return resolveWeatherTheme(null, null, new Date(now));
    return resolveWeatherTheme(closest.snapshot.weather, closest.snapshot.astronomical, new Date(now));
  }, [dynamic, forecast, now]);
  const mode = dynamic ? weatherPalette(weather.colorVariant).mode : resolvePaletteMode(preferences.themeId, preferences.appearanceMode, systemLight);
  const reducedMotion = systemReducedMotion || preferences.reducedMotion;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = preferences.themeId;
    root.dataset.theme = mode;
    root.dataset.weather = dynamic ? weather.weatherState : "none";
    root.dataset.reducedMotion = String(reducedMotion);
    root.dataset.appearanceReady = "true";
    const custom = dynamic ? weatherPalette(weather.colorVariant) : null;
    const tokens = custom ? paletteTokens(custom.palette, custom.mode) : {};
    for (const key of Object.keys(paletteTokens(weatherPalette("neutral").palette, "dark"))) {
      if (tokens[key]) root.style.setProperty(key, tokens[key]); else root.style.removeProperty(key);
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(root).getPropertyValue("--background").trim());
    window.dispatchEvent(new Event("fishing-theme"));
  }, [preferences.themeId, mode, dynamic, weather, reducedMotion]);

  const updatePreferences = useCallback((patch: Partial<AppearancePreferences>) => {
    const identity = currentProfile.current;
    const previous = currentPreferences.current;
    const next = normalizeAppearancePreferences({ ...previous, ...patch }, identity.plan);
    if (!canUsePremiumAppearance(identity.plan) && next.themeId !== "deep-ocean") return false;
    const edit = ++revision.current;
    const epoch = generation.current;
    currentPreferences.current = next; setPreferences(next);
    if (!identity.userId) {
      saved.current = next; writeCache(null, next); setStatus("local"); return true;
    }
    savesPending.current++; setStatus("saving");
    writeQueue.current = writeQueue.current.then(async () => {
      if (currentProfile.current.userId !== identity.userId || epoch !== generation.current) { savesPending.current--; return; }
      try {
        const response = await fetch("/api/profile/appearance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
        if (!response.ok) throw new Error("save");
        const data = await response.json();
        if (currentProfile.current.userId !== identity.userId || epoch !== generation.current) return;
        saved.current = normalizeAppearancePreferences(data.preferences ?? next);
        writeCache(identity.userId, saved.current);
        if (edit === revision.current) setStatus("saved");
      } catch {
        if (edit === revision.current && currentProfile.current.userId === identity.userId && epoch === generation.current) {
          currentPreferences.current = saved.current; setPreferences(saved.current); setStatus("error");
        }
      } finally { savesPending.current--; }
    });
    return true;
  }, []);
  const publishForecast = useCallback((value: ForecastViewModel) => { setForecast(value); setNow(Date.now()); }, []);
  return <Context.Provider value={{ preferences, profile, loading, status, mode, reducedMotion, systemReducedMotion, weather, weatherLocation: forecast?.location.label, weatherSource: forecast?.providerLabel, updatePreferences, publishForecast, refreshProfile }}>{children}</Context.Provider>;
}
export function useAppearance() {
  const context = useContext(Context);
  if (!context) throw new Error("Appearance requires ThemeProvider");
  return context;
}
export function ForecastThemeBridge({ forecast }: { forecast: ForecastViewModel }) {
  const { publishForecast } = useAppearance();
  useEffect(() => { publishForecast(forecast); }, [forecast, publishForecast]);
  return null;
}
