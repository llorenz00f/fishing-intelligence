"use client";
import { ForecastThemeBridge } from "@/components/appearance/ThemeProvider";
import { useRef, useState } from "react";
import { CalendarDays, Check, Fish, MapPin, RefreshCw, Star, Target } from "lucide-react";
import type { DailyForecastViewModel, ForecastViewModel, HourlyForecastViewModel } from "@/application/services/forecast-service";
import { MobileHeader } from "@/components/app/MobileHeader";
import { ScoreHero } from "./ScoreCard";
import { ConditionCards } from "@/components/ui/ConditionCards";
import { FactorBreakdown } from "./FactorBreakdown";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { disciplines, labelForSpecies, labelForTechnique, species, techniques } from "@/data/catalog";
import type { DisciplineCode, TechniqueCode } from "@/types/product";
import { EmptyState, FilterChip } from "@/components/ui/ProductPrimitives";
import { ForecastTimeline } from "./ForecastTimeline";

type Filters = { discipline: DisciplineCode; technique: TechniqueCode; species: string; lat: string; lng: string; label: string };
export function FilterBottomSheet({ open, onClose, filters, onApply, pending }: { open: boolean; onClose: () => void; filters: Filters; onApply: (filters: Filters) => void; pending: boolean }) {
  const [draft, setDraft] = useState(filters);
  return <BottomSheet open={open} onClose={onClose} title="La tua previsione">
    <form className="stack" onSubmit={(event) => { event.preventDefault(); onApply(draft); }}>
      <fieldset className="filter-fieldset"><legend>Come peschi?</legend><div className="choice-grid">{disciplines.map(item => <button type="button" className="choice-card" aria-pressed={draft.discipline === item.code} data-active={draft.discipline === item.code} key={item.code} onClick={() => setDraft({ ...draft, discipline: item.code, technique: techniques.find(t => t.discipline === item.code)!.code })}><strong>{item.label}</strong>{draft.discipline === item.code ? <Check size={16} /> : null}</button>)}</div></fieldset>
      <div className="grid-2"><label>Tecnica<select value={draft.technique} onChange={event => setDraft({ ...draft, technique: event.target.value as TechniqueCode })}>{techniques.filter(item => item.discipline === draft.discipline).map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <label>Specie<select value={draft.species} onChange={event => setDraft({ ...draft, species: event.target.value })}>{species.map(item => <option key={item.code} value={item.code}>{item.commonName}</option>)}</select></label></div>
      <label>Localita<input value={draft.label} onChange={event => setDraft({ ...draft, label: event.target.value })} required /></label>
      <div className="grid-2 coordinate-fields"><label>Latitudine<input type="number" step="any" min="-90" max="90" inputMode="decimal" value={draft.lat} onChange={event => setDraft({ ...draft, lat: event.target.value })} required /></label>
      <label>Longitudine<input type="number" step="any" min="-180" max="180" inputMode="decimal" value={draft.lng} onChange={event => setDraft({ ...draft, lng: event.target.value })} required /></label></div>
      <div className="sheet-footer"><button className="primary-action" disabled={pending} type="submit">{pending ? "Aggiornamento..." : "Mostra previsioni"}</button></div>
    </form>
  </BottomSheet>;
}
export function ForecastDay({ day, selected, best, onSelect }: { day: DailyForecastViewModel; selected: boolean; best: boolean; onSelect: () => void }) {
  return <button className="forecast-day" data-selected={selected} data-best={best} aria-pressed={selected} onClick={onSelect} aria-label={`${new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric" }).format(new Date(day.date))}, score ${day.dailyScore}${best ? ", giorno migliore" : ""}`}>
    <span>{new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(new Date(day.date)).toUpperCase()}</span><strong>{day.dailyScore}</strong><small>{new Date(day.date).getUTCDate()}</small>
  </button>;
}
export function ForecastStrip({ days, date, best, onSelect }: { days: DailyForecastViewModel[]; date: string; best?: string; onSelect: (day: DailyForecastViewModel) => void }) {
  return <div className="forecast-strip" aria-label="Confronto giorni">{days.slice(0, 7).map(day => <ForecastDay key={day.date} day={day} selected={day.date === date} best={day.date === best} onSelect={() => onSelect(day)} />)}</div>;
}
export function ForecastExplorer({ initialForecast }: { initialForecast: ForecastViewModel }) {
  const initialDay = bestDay(initialForecast.days);
  const [forecast, setForecast] = useState(initialForecast);
  const [date, setDate] = useState(initialDay?.date ?? "");
  const [timestamp, setTimestamp] = useState(bestHour(initialDay)?.timestamp ?? initialForecast.current.timestamp);
  const [sheet, setSheet] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Filters>({ discipline: initialForecast.discipline, technique: initialForecast.technique, species: initialForecast.species ?? "SPIGOLA", lat: String(initialForecast.location.latitude), lng: String(initialForecast.location.longitude), label: initialForecast.location.label ?? "Area selezionata" });
  const requestRef = useRef(0);
  const day = forecast.days.find(d => d.date === date) ?? forecast.days[0];
  const hour = day?.hours.find(h => h.timestamp === timestamp) ?? day?.hours[0] ?? forecast.current;
  const best = bestDay(forecast.days);
  const window = day?.bestWindow;
  async function update(next: Filters) {
    const request = ++requestRef.current;
    setPending(true); setError(""); setSheet(false);
    try {
      const params = new URLSearchParams({ ...next, days: "7" });
      const response = await fetch(`/api/forecast?${params}`);
      if (!response.ok) throw new Error("forecast");
      const data: ForecastViewModel = await response.json();
      if (request !== requestRef.current) return;
      setForecast(data); setFilters(next);
      const best = bestDay(data.days);
      setDate(best?.date ?? ""); setTimestamp(bestHour(best)?.timestamp ?? data.current.timestamp);
    } catch {
      if (request === requestRef.current) setError("Non riusciamo ad aggiornare le previsioni. Restano visibili gli ultimi dati disponibili.");
    } finally { if (request === requestRef.current) setPending(false); }
  }
  function selectDay(next: DailyForecastViewModel) { setDate(next.date); setTimestamp(bestHour(next)?.timestamp ?? next.hours[0].timestamp); }
  return <>
    <ForecastThemeBridge forecast={forecast} />
    <MobileHeader title="Quando andare." location={forecast.location.label} />
    <div className="forecast-layout" aria-busy={pending}>
      <div className="stack">
        <ScoreHero title={best?.date === day?.date ? "IL GIORNO MIGLIORE" : new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "short" }).format(new Date(day?.date ?? hour.timestamp))} score={hour.score} location={forecast.location.label ?? ""} technique={labelForTechnique(forecast.technique)} species={labelForSpecies(forecast.species)} window={window ? `${formatHour(window.start)} – ${formatHour(window.end)}` : "Non disponibile"}>
          {best?.date === day?.date ? <p className="forecast-best"><Star size={16} />{new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(day.date))}</p> : null}
        </ScoreHero>
        <ForecastStrip days={forecast.days} date={day?.date ?? ""} best={best?.date} onSelect={selectDay} />
        <div className="filter-strip" aria-label="Filtri previsioni">
          <FilterChip onClick={() => setSheet(true)}><Target size={15} />{labelForTechnique(filters.technique)}</FilterChip>
          <FilterChip onClick={() => setSheet(true)}><Fish size={15} />{labelForSpecies(filters.species)}</FilterChip>
          <FilterChip onClick={() => setSheet(true)}><MapPin size={15} />{filters.label}</FilterChip>
          <span className="filter-chip"><CalendarDays size={15} />7 giorni</span>
        </div>
        {error ? <p className="form-message" role="alert">{error}</p> : null}
        <section><div className="section-heading"><h2>Ora per ora</h2><span className="help-text">Fishing Score</span></div>
          <ForecastTimeline hours={day?.hours ?? []} timestamp={hour.timestamp} onSelect={setTimestamp} />
          {!day ? <EmptyState title="Previsioni in arrivo">Alcuni dati non sono ancora disponibili per questa zona.</EmptyState> : null}
        </section>
        <div className="forecast-updated"><span>Aggiornato alle {formatHour(forecast.generatedAt)}</span><button className="icon-action" aria-label="Aggiorna previsioni" title="Aggiorna previsioni" disabled={pending} onClick={() => update(filters)}><RefreshCw size={18} className={pending ? "refreshing" : ""} /></button></div>
      </div>
      <aside className="stack"><div className="section-heading"><h2>Condizioni alle {formatHour(hour.timestamp)}</h2></div><ConditionCards snapshot={hour.snapshot} /><FactorBreakdown score={hour.score} /></aside>
    </div>
    {sheet ? <FilterBottomSheet key={JSON.stringify(filters)} open={sheet} onClose={() => setSheet(false)} filters={filters} onApply={update} pending={pending} /> : null}
  </>;
}
function bestDay(days: DailyForecastViewModel[]) { return days.slice(0, 7).reduce<DailyForecastViewModel | undefined>((best, day) => !best || day.dailyScore > best.dailyScore ? day : best, undefined); }
function bestHour(day?: DailyForecastViewModel): HourlyForecastViewModel | undefined { return day?.hours.find(hour => hour.timestamp === day.bestWindow?.start) ?? day?.hours[0]; }
function formatHour(timestamp: string) { return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }
