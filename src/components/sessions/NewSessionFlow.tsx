"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Check, ChevronRight, Fish, MapPin, Navigation, Play, Ship, Target, Waves } from "lucide-react";
import { disciplines, labelForSpecies, labelForTechnique, species, techniques } from "@/data/catalog";
import type { SpotView } from "@/domain/account/data";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { DisciplineCode, LocationPoint, TechniqueCode } from "@/types/product";
const icons = { SURFCASTING: Waves, SHORE_SPINNING: Fish, BOAT: Ship, SPEARFISHING: Anchor };
export function NewSessionFlow({ spots, initialLocation, userId }: { spots: SpotView[]; initialLocation: LocationPoint | null; userId: string }) {
  const router = useRouter();
  const [discipline, setDiscipline] = useState<DisciplineCode>("SHORE_SPINNING");
  const [technique, setTechnique] = useState<TechniqueCode>("SHORE_SPINNING");
  const [targetSpecies, setTargetSpecies] = useState("SPIGOLA");
  const [spot, setSpot] = useState(spots[0]?.name ?? initialLocation?.label ?? "");
  const [spotLocation, setSpotLocation] = useState<LocationPoint | null>(spots[0]?.location ?? initialLocation);
  const [sheet, setSheet] = useState<"technique" | "species" | "spot" | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  function updateDiscipline(next: DisciplineCode) {
    setDiscipline(next); setTechnique(techniques.find(item => item.discipline === next)?.code ?? "SHORE_SPINNING");
  }
  function locate() {
    if (!navigator.geolocation) { setMessage("Posizione non disponibile su questo dispositivo."); return; }
    navigator.geolocation.getCurrentPosition(position => { setSpot("La mia posizione"); setSpotLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: "La mia posizione" }); setMessage(""); }, () => setMessage("Non riusciamo a leggere la posizione. Puoi indicare uno spot."));
  }
  async function start() {
    if (!spotLocation) { setMessage("Scegli uno spot o usa la tua posizione prima di iniziare."); return; }
    setPending(true);
    try {
      const sessionId = crypto.randomUUID();
      const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, discipline, technique, targetSpecies, spot, location: spotLocation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      try {
        localStorage.setItem(`session:${userId}:${sessionId}`, JSON.stringify({ id: sessionId, discipline, technique, targetSpecies, spot, startTime: new Date().toISOString() }));
      } catch {
        // The session already exists remotely; the live view can continue without the local cache.
      }
      router.push(`/sessions/${sessionId}/live`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sessione non salvata. Riprova."); setPending(false); }
  }
  return <section className="session-start">
    <div><h2>Come peschi oggi?</h2><div className="choice-grid discipline-choices">{disciplines.map(item => { const Icon = icons[item.code]; return <button className="choice-card" aria-pressed={discipline === item.code} data-active={discipline === item.code} key={item.code} type="button" onClick={() => updateDiscipline(item.code)}><Icon size={26} /><strong>{item.label}</strong></button>; })}</div></div>
    <div className="session-selections">
      <button className="selection-row" onClick={() => setSheet("technique")}><Target size={22} /><span><small>Tecnica</small><strong>{labelForTechnique(technique)}</strong></span><ChevronRight size={19} /></button>
      <button className="selection-row" onClick={() => setSheet("species")}><Fish size={22} /><span><small>Specie target</small><strong>{labelForSpecies(targetSpecies)}</strong></span><ChevronRight size={19} /></button>
      <button className="selection-row" onClick={() => setSheet("spot")}><MapPin size={22} /><span><small>Spot</small><strong>{spot || "Scegli uno spot"}</strong></span><ChevronRight size={19} /></button>
    </div>
    {message ? <p className="form-message" role="status">{message}</p> : null}
    <button className="primary-action" onClick={() => void start()} disabled={pending || !spot.trim() || !spotLocation}><Play size={19} />{pending ? "Avvio..." : "Avvia sessione live"}</button>
    <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "technique" ? "La tua tecnica" : sheet === "species" ? "Che specie cerchi?" : "Dove peschi?"}>
      {sheet === "technique" ? <div className="choice-grid">{techniques.filter(item => item.discipline === discipline).map(item => <button className="choice-card" key={item.code} aria-pressed={technique === item.code} data-active={technique === item.code} onClick={() => { setTechnique(item.code); setSheet(null); }}><strong>{item.label}</strong>{technique === item.code ? <Check size={18} /> : null}</button>)}</div> : sheet === "species" ? <div className="choice-grid">{species.map(item => <button className="choice-card" key={item.code} aria-pressed={targetSpecies === item.code} data-active={targetSpecies === item.code} onClick={() => { setTargetSpecies(item.code); setSheet(null); }}><strong>{item.commonName}</strong><span>{item.scientificName}</span></button>)}</div> : <><label>Nome o coordinate<input value={spot} onChange={event => { setSpot(event.target.value); if (!spots.some(item => item.name === event.target.value)) setSpotLocation(null); }} /></label><button className="secondary-action" onClick={locate}><Navigation size={18} />Usa posizione</button>{message ? <p className="form-message">{message}</p> : null}<div className="spot-list">{spots.length ? spots.map(item => <button className="spot-card" key={item.id} onClick={() => { setSpot(item.name); setSpotLocation(item.location); setSheet(null); }}><MapPin size={18} /><strong>{item.name}</strong><ChevronRight size={18} /></button>) : <p className="muted">Non hai ancora salvato nessuno spot.</p>}</div><div className="sheet-footer"><button className="primary-action" disabled={!spot.trim() || !spotLocation} onClick={() => setSheet(null)}>Conferma spot</button></div></>}
    </BottomSheet>
  </section>;
}
