"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Check, ChevronRight, Fish, MapPin, Navigation, Play, Ship, Target, Waves } from "lucide-react";
import { disciplines, labelForSpecies, labelForTechnique, species, techniques } from "@/data/catalog";
import { demoSpots } from "@/data/demo";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { DisciplineCode, TechniqueCode } from "@/types/product";
const icons = { SURFCASTING: Waves, SHORE_SPINNING: Fish, BOAT: Ship, SPEARFISHING: Anchor };
export function NewSessionFlow() {
  const router = useRouter();
  const [discipline, setDiscipline] = useState<DisciplineCode>("SHORE_SPINNING");
  const [technique, setTechnique] = useState<TechniqueCode>("SHORE_SPINNING");
  const [targetSpecies, setTargetSpecies] = useState("SPIGOLA");
  const [spot, setSpot] = useState("Scogliera nord");
  const [sheet, setSheet] = useState<"technique" | "species" | "spot" | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  function updateDiscipline(next: DisciplineCode) {
    setDiscipline(next); setTechnique(techniques.find(item => item.discipline === next)?.code ?? "SHORE_SPINNING");
  }
  function locate() {
    if (!navigator.geolocation) { setMessage("Posizione non disponibile su questo dispositivo."); return; }
    navigator.geolocation.getCurrentPosition(position => { setSpot(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`); setMessage(""); }, () => setMessage("Non riusciamo a leggere la posizione. Puoi indicare uno spot."));
  }
  function start() {
    setPending(true);
    try {
      const sessionId = crypto.randomUUID();
      localStorage.setItem(`session:${sessionId}`, JSON.stringify({ id: sessionId, discipline, technique, targetSpecies, spot, startTime: new Date().toISOString() }));
      router.push(`/sessions/${sessionId}/live`);
    } catch { setMessage("Il dispositivo non consente di salvare la sessione. Controlla lo spazio disponibile e riprova."); setPending(false); }
  }
  return <section className="session-start">
    <div><h2>Come peschi oggi?</h2><div className="choice-grid discipline-choices">{disciplines.map(item => { const Icon = icons[item.code]; return <button className="choice-card" aria-pressed={discipline === item.code} data-active={discipline === item.code} key={item.code} type="button" onClick={() => updateDiscipline(item.code)}><Icon size={26} /><strong>{item.label}</strong></button>; })}</div></div>
    <div className="session-selections">
      <button className="selection-row" onClick={() => setSheet("technique")}><Target size={22} /><span><small>Tecnica</small><strong>{labelForTechnique(technique)}</strong></span><ChevronRight size={19} /></button>
      <button className="selection-row" onClick={() => setSheet("species")}><Fish size={22} /><span><small>Specie target</small><strong>{labelForSpecies(targetSpecies)}</strong></span><ChevronRight size={19} /></button>
      <button className="selection-row" onClick={() => setSheet("spot")}><MapPin size={22} /><span><small>Spot</small><strong>{spot || "Scegli uno spot"}</strong></span><ChevronRight size={19} /></button>
    </div>
    {message ? <p className="form-message" role="status">{message}</p> : null}
    <button className="primary-action" onClick={start} disabled={pending || !spot.trim()}><Play size={19} />{pending ? "Avvio..." : "Avvia sessione live"}</button>
    <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "technique" ? "La tua tecnica" : sheet === "species" ? "Che specie cerchi?" : "Dove peschi?"}>
      {sheet === "technique" ? <div className="choice-grid">{techniques.filter(item => item.discipline === discipline).map(item => <button className="choice-card" key={item.code} aria-pressed={technique === item.code} data-active={technique === item.code} onClick={() => { setTechnique(item.code); setSheet(null); }}><strong>{item.label}</strong>{technique === item.code ? <Check size={18} /> : null}</button>)}</div> : sheet === "species" ? <div className="choice-grid">{species.map(item => <button className="choice-card" key={item.code} aria-pressed={targetSpecies === item.code} data-active={targetSpecies === item.code} onClick={() => { setTargetSpecies(item.code); setSheet(null); }}><strong>{item.commonName}</strong><span>{item.scientificName}</span></button>)}</div> : <><label>Nome o coordinate<input value={spot} onChange={event => setSpot(event.target.value)} /></label><button className="secondary-action" onClick={locate}><Navigation size={18} />Usa posizione</button>{message ? <p className="form-message">{message}</p> : null}<div className="spot-list">{demoSpots.map(item => <button className="spot-card" key={item.id} onClick={() => { setSpot(item.name); setSheet(null); }}><MapPin size={18} /><strong>{item.name}</strong><ChevronRight size={18} /></button>)}</div><div className="sheet-footer"><button className="primary-action" disabled={!spot.trim()} onClick={() => setSheet(null)}>Conferma spot</button></div></>}
    </BottomSheet>
  </section>;
}
