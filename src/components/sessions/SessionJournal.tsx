"use client";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, Plus, SlidersHorizontal } from "lucide-react";
import type { FishingSession } from "@/domain/sessions/types";
import { SessionCard } from "./SessionCard";
import { MobileHeader } from "@/components/app/MobileHeader";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState, StatCard } from "@/components/ui/ProductPrimitives";
import { disciplines } from "@/data/catalog";
import { useLocalSessions } from "./useLocalSessions";

export function SessionJournal({ sessions: initialSessions }: { sessions: FishingSession[] }) {
  const { sessions: localSessions } = useLocalSessions();
  const initialIds = new Set(initialSessions.map(session => session.id));
  const sessions = [...localSessions.filter(session => !initialIds.has(session.id)), ...initialSessions].sort((a, b) => b.startTime.localeCompare(a.startTime));
  const [sheet, setSheet] = useState(false);
  const [filter, setFilter] = useState({ outcome: "all", discipline: "all", period: "all" });
  const [draft, setDraft] = useState(filter);
  const [now] = useState(() => Date.now());
  const visible = sessions.filter(session => (filter.outcome === "all" || (filter.outcome === "catch" ? session.catches.length > 0 : session.catches.length === 0)) && (filter.discipline === "all" || session.discipline === filter.discipline) && (filter.period === "all" || new Date(session.startTime).getTime() >= now - 30 * 86400000));
  const hours = sessions.reduce((sum, session) => sum + (session.endTime ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 3600000 : 0), 0);
  const activeFilters = Object.values(filter).filter(value => value !== "all").length;
  return <>
    <MobileHeader title="Il tuo diario." />
    <div className="journal-stats"><StatCard label="Uscite" value={sessions.length} /><StatCard label="Ore in mare" value={hours.toFixed(1)} /><StatCard label="Catture" value={sessions.reduce((sum, session) => sum + session.catches.length, 0)} /></div>
    <Link className="primary-action journal-start" href="/sessions/new"><Plus size={19} />Inizia sessione</Link>
    <div className="section-heading"><h2>{visible.length} uscite</h2><button className="text-action" type="button" onClick={() => { setDraft(filter); setSheet(true); }}><SlidersHorizontal size={17} />Filtri{activeFilters ? ` (${activeFilters})` : ""}</button></div>
    {visible.length ? <div className="grid-3">{visible.map(session => <SessionCard key={session.id} session={session} />)}</div> : <EmptyState title={sessions.length ? "Nessuna uscita trovata" : "Il tuo diario inizia qui"}>{sessions.length ? <><span>Nessuna sessione corrisponde a questi filtri.</span><button className="secondary-action" onClick={() => setFilter({ outcome: "all", discipline: "all", period: "all" })}>Mostra tutte</button></> : <><span>Registra la tua prima uscita per iniziare a riconoscere le condizioni migliori per te.</span><Link className="primary-action" href="/sessions/new"><BookOpen size={18} />Inizia sessione</Link></>}</EmptyState>}
    <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filtra il diario">
      <label>Periodo<select value={draft.period} onChange={event => setDraft({ ...draft, period: event.target.value })}><option value="all">Tutto lo storico</option><option value="30">Ultimi 30 giorni</option></select></label>
      <label>Disciplina<select value={draft.discipline} onChange={event => setDraft({ ...draft, discipline: event.target.value })}><option value="all">Tutte le discipline</option>{disciplines.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <label>Esito<select value={draft.outcome} onChange={event => setDraft({ ...draft, outcome: event.target.value })}><option value="all">Tutte le uscite</option><option value="catch">Con catture</option><option value="blank">Senza catture</option></select></label>
      <div className="sheet-footer"><button className="secondary-action" onClick={() => setDraft({ outcome: "all", discipline: "all", period: "all" })}>Azzera</button><button className="primary-action" onClick={() => { setFilter(draft); setSheet(false); }}>Mostra uscite</button></div>
    </BottomSheet>
  </>;
}
