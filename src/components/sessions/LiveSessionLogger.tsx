"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ElementType } from "react";
import { ArrowLeft, Camera, Check, CheckCircle2, Fish, MapPin, MessageSquare, Radio, Save, Square, Wifi, WifiOff } from "lucide-react";
import type { SessionEvent, SessionEventType } from "@/domain/sessions/types";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { labelForSpecies, labelForTechnique } from "@/data/catalog";
import type { DisciplineCode, TechniqueCode } from "@/types/product";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ThemeToggle } from "@/components/app/ThemeToggle";

type StoredSession = { discipline?: DisciplineCode; technique?: TechniqueCode; targetSpecies?: string; spot?: string; startTime?: string; endTime?: string };
const eventLabels: Record<SessionEventType, string> = { STRIKE: "Abboccata", CATCH: "Cattura", SPOT_CHANGE: "Cambio spot", NOTE: "Nota", PHOTO: "Foto" };
const eventIcons: Record<SessionEventType, ElementType> = { STRIKE: Radio, CATCH: Fish, SPOT_CHANGE: MapPin, NOTE: MessageSquare, PHOTO: Camera };
export function LiveSessionAction({ label, icon: Icon, primary, wide, onClick, disabled }: { label: string; icon: ElementType; primary?: boolean; wide?: boolean; onClick: () => void; disabled?: boolean }) {
  return <button className={`live-action${primary ? " live-action--primary" : ""}${wide ? " live-action--wide" : ""}`} type="button" onClick={onClick} disabled={disabled}><Icon size={28} />{label}</button>;
}
export function LiveSessionLogger({ sessionId, userId, initialSession }: { sessionId: string; userId: string; initialSession?: StoredSession }) {
  const [session, setSession] = useState<StoredSession>(initialSession ?? {});
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [note, setNote] = useState("");
  const [spot, setSpot] = useState("");
  const [sheet, setSheet] = useState<"note" | "spot" | "finish" | null>(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const finishing = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pendingEvents, storedEvents, enqueue, sync } = useOfflineQueue(userId, sessionId);
  const duration = useDuration(session.startTime, session.endTime);
  const ended = Boolean(session.endTime);
  const eventMap = new Map(events.map(event => [event.clientId, event]));
  storedEvents.forEach(event => eventMap.set(event.clientId, event));
  const displayedEvents = [...eventMap.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const catches = displayedEvents.filter(event => event.type === "CATCH").length;
  const strikes = displayedEvents.filter(event => event.type === "STRIKE").length;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = { ...initialSession, ...loadSession(userId, sessionId) };
      loaded.startTime ??= new Date().toISOString();
      setSession(loaded); setReady(true); setOnline(navigator.onLine);
      try { localStorage.setItem(`session:${userId}:${sessionId}`, JSON.stringify(loaded)); } catch { setToast("Il dispositivo non consente di conservare i dettagli della sessione."); }
    }, 0);
    const onOnline = () => setOnline(true); const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { window.clearTimeout(timer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [sessionId, userId, initialSession]);
  function confirm(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }
  async function log(type: SessionEventType, text?: string) {
    if (ended) return false;
    const event: SessionEvent = { id: crypto.randomUUID(), clientId: crypto.randomUUID(), sessionId, type, timestamp: new Date().toISOString(), note: text, synced: false };
    setEvents(current => [event, ...current]);
    try {
      await enqueue(event);
      confirm(type === "PHOTO" ? "Foto annotata nel diario" : `${eventLabels[type]} registrata`);
      await sync();
      return true;
    } catch {
      confirm("Salvataggio non completato. Controlla lo spazio sul dispositivo.");
      setEvents(current => current.filter(item => item.clientId !== event.clientId));
      return false;
    }
  }
  async function finish() {
    if (finishing.current) return;
    finishing.current = true; setSaving(true);
    const success = await log("NOTE", "Sessione terminata.");
    if (success) {
      const updated = { ...session, endTime: new Date().toISOString() };
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endTime: updated.endTime }) }).catch(() => null);
      if (!response?.ok) { confirm("Sessione chiusa sul dispositivo. La sincronizzazione verra ritentata quando torni online."); }
      try { localStorage.setItem(`session:${userId}:${sessionId}`, JSON.stringify(updated)); } catch { confirm("Sessione chiusa. Il riepilogo resta disponibile finche questa pagina e aperta."); }
      setSession(updated); setSheet(null);
    }
    setSaving(false); finishing.current = false;
  }
  async function saveNote() {
    setSaving(true);
    if (await log("NOTE", note.trim())) { setNote(""); setSheet(null); }
    setSaving(false);
  }
  async function changeSpot() {
    setSaving(true);
    if (await log("SPOT_CHANGE", spot.trim())) {
      const updated = { ...session, spot: spot.trim() };
      setSession(updated); setSheet(null);
      try { localStorage.setItem(`session:${userId}:${sessionId}`, JSON.stringify(updated)); } catch { confirm("Cambio spot registrato. Dettagli disponibili in questa pagina."); }
    }
    setSaving(false);
  }
  return <section className="live-session">
    <header className="live-topbar"><Link className="icon-action" href="/sessions" aria-label="Torna al diario" title="Torna al diario"><ArrowLeft size={20} /></Link><h1><span className="live-dot" />{ended ? "Sessione conclusa" : "Sessione live"}</h1><ThemeToggle /></header>
    <section className="live-hero"><span className="live-sync">{online ? <Wifi size={15} /> : <WifiOff size={15} />}{!online ? "Offline · salvataggio sul dispositivo" : pendingEvents.length ? `${pendingEvents.length} eventi in attesa di invio` : "Tutto sincronizzato"}</span>
      <div className="live-timer" aria-label="Durata sessione">{ready ? duration : "00:00:00"}</div>
      <p className="location-label"><MapPin size={16} />{session.spot ?? "Posizione da indicare"}</p>
      <p className="live-context">{session.technique ? labelForTechnique(session.technique) : "Tecnica da indicare"}<span>·</span>{labelForSpecies(session.targetSpecies)}</p>
    </section>
    <div className="live-counter-strip" aria-live="polite"><div><strong>{strikes}</strong><span>Abboccate</span></div><div><strong>{catches}</strong><span>Catture</span></div><div><strong>{displayedEvents.filter(event => event.type === "SPOT_CHANGE").length}</strong><span>Cambi spot</span></div></div>
    {ended ? <div className="live-ended"><CheckCircle2 size={36} /><h2>Un&apos;altra uscita nel tuo diario.</h2><p className="muted">{catches} catture · {strikes} abboccate</p><Link className="primary-action" href="/sessions/new">Nuova sessione</Link><Link className="text-action" href="/sessions">Torna al diario</Link></div> : <div className="live-recording">
      <div className="live-actions" aria-label="Azioni sessione"><LiveSessionAction label="Abboccata" icon={Radio} onClick={() => void log("STRIKE")} disabled={!ready || saving} /><LiveSessionAction label="Cattura" icon={Fish} primary onClick={() => void log("CATCH")} disabled={!ready || saving} /><LiveSessionAction label="Cambio spot" icon={MapPin} wide onClick={() => { setSpot(session.spot ?? ""); setSheet("spot"); }} disabled={!ready || saving} /></div>
      <div className="live-secondary"><button className="secondary-action" onClick={() => setSheet("note")} disabled={!ready || saving}><MessageSquare size={20} />Nota</button><button className="secondary-action" onClick={() => void log("PHOTO")} disabled={!ready || saving}><Camera size={20} />Foto</button></div>
      <div className="live-end"><button className="danger-action" onClick={() => setSheet("finish")} disabled={!ready || saving}><Square size={16} />Termina sessione</button></div>
    </div>}
    <section className="panel"><div className="section-heading"><h2>La tua uscita</h2><span className="help-text">{displayedEvents.length} eventi</span></div><div className="event-list">
      {displayedEvents.length ? displayedEvents.map(event => { const Icon = eventIcons[event.type]; return <article className="event-row" key={event.clientId}><span className="event-icon"><Icon size={18} /></span><div><strong>{eventLabels[event.type]}</strong><p>{new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.timestamp))}{event.synced ? " · salvato" : " · sul dispositivo"}</p>{event.note ? <p>{event.note}</p> : null}</div></article>; }) : <p className="muted">Il mare, per ora. Il diario e pronto.</p>}
    </div></section>
    <BottomSheet open={sheet !== null} onClose={() => { if (!saving) setSheet(null); }} title={sheet === "note" ? "Una nota dal mare" : sheet === "spot" ? "Cambio spot" : "Termini l'uscita?"}>
      {sheet === "note" ? <><label>Nota<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Esca, corrente, inseguimenti..." /></label><div className="sheet-footer"><button className="primary-action" disabled={!note.trim() || saving} onClick={saveNote}><Save size={18} />Salva nota</button></div></> : sheet === "spot" ? <><label>Nuova posizione<input value={spot} onChange={event => setSpot(event.target.value)} placeholder="Nome o coordinate" /></label><div className="sheet-footer"><button className="primary-action" disabled={!spot.trim() || saving} onClick={changeSpot}><MapPin size={18} />Conferma posizione</button></div></> : <><p className="muted">{catches} catture e {strikes} abboccate in {duration}. Anche un&apos;uscita senza catture arricchisce il tuo diario.</p><div className="sheet-footer"><button className="secondary-action" disabled={saving} onClick={() => setSheet(null)}>Continua</button><button className="primary-action" disabled={saving} onClick={finish}><Check size={18} />{saving ? "Salvataggio..." : "Termina e salva"}</button></div></>}
    </BottomSheet>
    {toast ? <div className="toast" role="status"><Check size={17} />{toast}</div> : null}
  </section>;
}
function loadSession(userId: string, sessionId: string): StoredSession {
  try { return JSON.parse(localStorage.getItem(`session:${userId}:${sessionId}`) ?? "{}") as StoredSession; } catch { return {}; }
}
function useDuration(start?: string, end?: string) {
  const [now, setNow] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const seconds = start ? Math.max(0, Math.floor(((end ? new Date(end).getTime() : now) - new Date(start).getTime()) / 1000)) : 0;
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, "0")).join(":");
}
