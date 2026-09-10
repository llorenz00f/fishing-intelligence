import Link from "next/link";
import { LocalSessionDetail } from "@/components/sessions/LocalSessionDetail";
import { Fish, Play, Radio, Timer } from "lucide-react";
import { demoSessions } from "@/data/demo";
import { labelForSpecies, labelForTechnique } from "@/data/catalog";
import { Metric, PageHeader } from "@/components/ui/ProductPrimitives";
import type { SessionEventType } from "@/domain/sessions/types";

const eventLabels: Record<SessionEventType, string> = {
  STRIKE: "Abboccata",
  CATCH: "Cattura",
  SPOT_CHANGE: "Cambio spot",
  NOTE: "Nota",
  PHOTO: "Foto",
};

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = demoSessions.find((item) => item.id === id);
  if (!session) return <LocalSessionDetail sessionId={id} />;

  const strikes = session.events.filter((event) => event.type === "STRIKE").length;

  return (
    <>
      <PageHeader
        eyebrow={session.primarySpot}
        title={labelForTechnique(session.technique)}
        actions={
          <Link className="secondary-action" href={`/sessions/${session.id}/live`}>
            <Play size={18} />
            Apri live
          </Link>
        }
      >
        <p>
          {new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short" }).format(
            new Date(session.startTime),
          )}
        </p>
      </PageHeader>

      <div className="session-detail-grid">
        <section className="stack">
          <div className="score-card">
            <div className="session-card-head">
              <div className="session-card-title">
                <p className="eyebrow">Riepilogo</p>
                <h2>{labelForSpecies(session.targetSpecies)}</h2>
                <p className="muted">Una sessione registrata resta utile anche quando il mare non risponde.</p>
              </div>
              <span className="chip">
                <Fish size={15} />
                {session.catches.length} catture
              </span>
            </div>
            <div className="session-metrics">
              <Metric label="Durata" value={formatDuration(session.startTime, session.endTime)} icon={<Timer size={18} />} />
              <Metric label="Abboccate" value={strikes} icon={<Radio size={18} />} />
              <Metric label="Valutazione" value={session.rating ?? "N/D"} />
              <Metric label="Score condizioni" value={session.conditionScore ?? "N/D"} />
            </div>
          </div>
          <div className="disclaimer">
            Anche una sessione senza catture viene salvata normalmente per migliorare il modello personale.
          </div>
        </section>

        <aside className="panel">
          <p className="eyebrow">Timeline</p>
          <div className="event-list">
            {session.events.map((event) => (
              <article className="event-row" key={event.id}>
                <span className="event-icon">
                  <Radio size={18} />
                </span>
                <div>
                  <strong>{eventLabels[event.type]}</strong>
                  <p className="muted">
                    {new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(
                      new Date(event.timestamp),
                    )}
                  </p>
                  {event.note ? <p>{event.note.replace("demo", "registrato")}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function formatDuration(start: string, end?: string) {
  if (!end) return "Live";
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
