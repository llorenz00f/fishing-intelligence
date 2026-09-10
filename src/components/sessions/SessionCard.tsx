import Link from "next/link";
import { ArrowUpRight, Fish, Timer } from "lucide-react";
import type { JournalSession } from "./useLocalSessions";
import { labelForSpecies, labelForTechnique } from "@/data/catalog";
export function SessionCard({ session, compact = false }: { session: JournalSession; compact?: boolean }) {
  const minutes = session.endTime ? Math.max(0, Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)) : 0;
  return <Link className="session-card" data-compact={compact} href={`/sessions/${session.id}`}>
    <div className="session-card-head"><time dateTime={session.startTime}>{new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(session.startTime))}</time><span className="session-score">{session.conditionScore ?? "N/D"}<small>SCORE</small></span></div>
    <div className="session-card-title"><h3>{session.primarySpot ?? "Uscita in mare"}</h3><p>{labelForTechnique(session.technique)} · {labelForSpecies(session.targetSpecies)}</p></div>
    <div className="session-card-foot"><span><Timer size={16} />{session.endTime ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : "In corso"}</span><span><Fish size={16} />{session.catches.length} catture</span><ArrowUpRight size={18} /></div>
  </Link>;
}
