"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CloudSun, Crown, LockKeyhole, Monitor, Moon, Sun, Waves } from "lucide-react";
import { themeRegistry, getTheme, type ThemeDefinition } from "@/domain/appearance/registry";
import { canUsePremiumAppearance } from "@/domain/appearance/preferences";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppearance } from "./ThemeProvider";

export function ThemePreviewCard({ theme, selected, locked, onSelect }: { theme: ThemeDefinition; selected: boolean; locked: boolean; onSelect: () => void }) {
  return <button type="button" className="theme-choice" aria-label={theme.name} aria-pressed={selected} onClick={onSelect}>
    <span className="theme-preview" data-preview-palette={theme.id} data-preview-mode={theme.defaultMode} aria-hidden="true">
      <span className="preview-top"><Waves size={16} /><span /><i /></span>
      <span className="preview-body"><span className="preview-score"><strong>78</strong><span>Fishing Score</span></span><span className="preview-lines"><b /><i /><i /><em /></span></span>
      <span className="preview-chart">{[28, 41, 37, 62, 75, 58, 46, 68, 81, 72, 51, 38].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span>
      {theme.id === "dynamic-weather" ? <span className="preview-weather"><CloudSun size={16} /><span>Live</span></span> : null}
    </span>
    <span className="theme-choice-label"><span><strong>{theme.name}</strong><small>{theme.subtitle}</small></span><span className="theme-choice-check">{selected ? <Check size={18} /> : locked ? <LockKeyhole size={15} /> : null}</span></span>
  </button>;
}

const weatherNames = { neutral: "In attesa delle condizioni", "clear-day": "Sereno", "clear-night": "Notte serena", "partly-cloudy": "Parzialmente nuvoloso", cloudy: "Nuvoloso", rain: "Pioggia", "heavy-rain": "Pioggia intensa", thunderstorm: "Temporale", fog: "Foschia", windy: "Vento", sunrise: "Alba", sunset: "Tramonto" };

export function AppearanceSettings() {
  const { preferences, profile, updatePreferences, loading, status, weather, weatherLocation, weatherSource, systemReducedMotion } = useAppearance();
  const [upsell, setUpsell] = useState(false);
  const premium = canUsePremiumAppearance(profile.plan);
  const theme = getTheme(preferences.themeId);
  const selectTheme = (next: ThemeDefinition) => {
    if (next.premium && !premium) { setUpsell(true); return; }
    updatePreferences({ themeId: next.id, dynamicWeatherThemeEnabled: next.id === "dynamic-weather", appearanceMode: next.id === "deep-ocean" ? preferences.appearanceMode : next.defaultMode });
  };
  return <div className="appearance-page">
    <Link href="/profile" className="appearance-back"><ArrowLeft size={17} />Profilo</Link>
    <header className="appearance-heading"><div><p className="eyebrow">IL TUO SPAZIO</p><h1>Aspetto</h1><p className="muted">Il mare ha mille sfumature. Scegli la tua.</p></div><span className="appearance-plan"><Crown size={15} />{profile.plan}</span></header>
    <div className="appearance-layout">
      <section className="appearance-themes" aria-labelledby="themes-title">
        <div className="section-heading"><h2 id="themes-title">Tema</h2><span className="help-text">{theme.name}</span></div>
        <div className="theme-grid" aria-busy={loading}>{themeRegistry.map(item => <ThemePreviewCard key={item.id} theme={item} selected={preferences.themeId === item.id} locked={item.premium && !premium} onSelect={() => { if (!loading) selectTheme(item); }} />)}</div>
      </section>
      <aside className="appearance-controls">
        <section className="appearance-setting" aria-labelledby="appearance-mode"><h2 id="appearance-mode">Luminosita</h2>
          {theme.modes.length > 1 ? <div className="appearance-segmented" role="group" aria-label="Luminosita">{([{ id: "light", name: "Chiara", icon: Sun }, { id: "dark", name: "Scura", icon: Moon }, { id: "system", name: "Sistema", icon: Monitor }] as const).map(({ id, name, icon: Icon }) => <button key={id} disabled={loading} aria-pressed={preferences.appearanceMode === id} onClick={() => updatePreferences({ appearanceMode: id })}><Icon size={18} /><span>{name}</span></button>)}</div> : <div className="appearance-mode-fixed">{preferences.themeId === "dynamic-weather" ? <CloudSun size={20} /> : theme.defaultMode === "light" ? <Sun size={20} /> : <Moon size={20} />}<span>{preferences.themeId === "dynamic-weather" ? "Segue il meteo" : theme.defaultMode === "light" ? "Chiara" : "Scura"}</span></div>}
        </section>
        <section className="appearance-setting" aria-labelledby="ambient-title"><div className="section-heading"><h2 id="ambient-title">Effetti ambientali</h2>{!premium ? <LockKeyhole size={15} /> : null}</div>
          <div className="appearance-segmented" role="group" aria-label="Effetti ambientali">{([{ id: "off", name: "Disattivati" }, { id: "reduced", name: "Ridotti" }, { id: "standard", name: "Standard" }] as const).map(({ id, name }) => <button key={id} disabled={loading} aria-pressed={preferences.ambientEffectIntensity === id} onClick={() => { if (!premium) setUpsell(true); else updatePreferences({ ambientEffectIntensity: id }); }}>{name}</button>)}</div>
        </section>
        <section className="appearance-setting"><label className="appearance-switch"><span><strong>Animazioni ridotte</strong>{systemReducedMotion ? <small>Attive anche nelle preferenze del dispositivo</small> : null}</span><input type="checkbox" role="switch" checked={preferences.reducedMotion || systemReducedMotion} disabled={loading || systemReducedMotion} onChange={event => updatePreferences({ reducedMotion: event.target.checked })} /><span className="switch-track" aria-hidden="true" /></label></section>
        {preferences.themeId === "dynamic-weather" ? <section className="appearance-weather-status" aria-label="Meteo del tema"><CloudSun size={25} /><div><strong>{weatherNames[weather.weatherState]}</strong><span>{weatherLocation ?? "Nessuna posizione selezionata"}</span>{weather.weatherState === "neutral" ? <small>Deep Ocean</small> : weatherSource?.toLowerCase().includes("mock") ? <small>Condizioni dimostrative</small> : null}</div></section> : null}
        <p className="appearance-save" role="status" aria-live="polite">{status === "saving" ? "Salvataggio..." : status === "error" ? "Salvataggio non disponibile. Ultimo aspetto salvato mantenuto." : status === "saved" ? <><CheckCircle2 size={16} />Aspetto aggiornato</> : status === "local" ? <><CheckCircle2 size={16} />Aspetto aggiornato su questo dispositivo</> : profile.userId ? "Sincronizzato con il tuo profilo" : "Preferenze su questo dispositivo"}</p>
      </aside>
    </div>
    {upsell ? <BottomSheet open onClose={() => setUpsell(false)} title="Personalizza Fishing Intelligence"><div className="appearance-upsell"><Crown size={30} /><p>Disponibile con PRO.</p><div className="upsell-palette-strip" aria-hidden="true">{themeRegistry.slice(0, 5).map(item => <span key={item.id} data-preview-palette={item.id} data-preview-mode={item.defaultMode}><Waves size={24} /></span>)}</div><Link className="primary-action" href="/profile/plan" onClick={() => setUpsell(false)}>Scopri PRO<ArrowRight size={18} /></Link></div></BottomSheet> : null}
  </div>;
}
