"use client";
import Link from "next/link";
import { ArrowLeft, Fish, Play, Radio, Timer } from "lucide-react";
import { useLocalSessions } from "./useLocalSessions";
import { labelForSpecies, labelForTechnique } from "@/data/catalog";
import { EmptyState, Metric, PageHeader } from "@/components/ui/ProductPrimitives";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type { FishingSession } from "@/domain/sessions/types";
const labels = { STRIKE: "Abboccata", CATCH: "Cattura", SPOT_CHANGE: "Cambio spot", NOTE: "Nota", PHOTO: "Foto" };
export function LocalSessionDetail({ sessionId, userId, initialSession }: { sessionId: string; userId: string; initialSession?: FishingSession | null }) {
  const { sessions, loaded } = useLocalSessions(userId);
  const session = initialSession ?? sessions.find(item => item.id === sessionId);
  if (!loaded) return <LoadingSkeleton kind="sessions" />;
  if (!session) return <EmptyState title="Non troviamo questa uscita"><span>La sessione non e presente su questo dispositivo.</span><Link className="secondary-action" href="/sessions"><ArrowLeft size={18} />Torna al diario</Link></EmptyState>;
  const minutes = session.endTime ? Math.round((Date.parse(session.endTime) - Date.parse(session.startTime)) / 60000) : 0;
  return <>
    <PageHeader eyebrow={session.primarySpot} title={labelForTechnique(session.technique)} actions={!session.endTime ? <Link className="primary-action" href={`/sessions/${session.id}/live`}><Play size={18} />Riprendi sessione</Link> : undefined}><p>{new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short" }).format(new Date(session.startTime))}</p></PageHeader>
    <div className="session-detail-grid"><section className="stack"><h2>{labelForSpecies(session.targetSpecies)}</h2><div className="session-metrics"><Metric label="Durata" value={session.endTime ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : "In corso"} icon={<Timer size={20} />} /><Metric label="Catture" value={session.catches.length} icon={<Fish size={20} />} /><Metric label="Abboccate" value={session.events.filter(event => event.type === "STRIKE").length} icon={<Radio size={20} />} /></div><Link className="text-action" href="/sessions"><ArrowLeft size={18} />Torna al diario</Link></section>
    <section className="panel"><h2>La tua uscita</h2><div className="event-list">{session.events.map(event => <article className="event-row" key={event.clientId}><span className="event-icon">{event.type === "CATCH" ? <Fish size={18} /> : <Radio size={18} />}</span><div><strong>{labels[event.type]}</strong><p>{new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.timestamp))}</p>{event.note ? <p>{event.note}</p> : null}</div></article>)}</div></section></div>
  </>;
}
