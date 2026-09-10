"use client";
import Link from "next/link";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as maplibregl from "maplibre-gl";
import { Anchor, ArrowLeft, ArrowRight, Check, Fish, Layers, LocateFixed, Minus, Plus, Save, Ship, Waves } from "lucide-react";
import { demoLocation, demoSessions, demoSpots } from "@/data/demo";
import { labelForDiscipline } from "@/data/catalog";
import { getDefaultTileProvider } from "@/infrastructure/providers/maps";
import type { DisciplineCode, LocationPoint, TechniqueCode } from "@/types/product";
import type { ForecastViewModel } from "@/application/services/forecast-service";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MapBottomSheet, type SheetSnap } from "./MapBottomSheet";
import { ThemeToggle } from "@/components/app/ThemeToggle";

type SpotView = { id: string; name: string; location: LocationPoint; discipline?: DisciplineCode; notes?: string };
const techniqueFor: Record<DisciplineCode, TechniqueCode> = { BOAT: "BOTTOM_FISHING", SHORE_SPINNING: "SHORE_SPINNING", SURFCASTING: "STANDARD_SURFCASTING", SPEARFISHING: "SPEAR_AMBUSH" };
export function FishingSpotMarker({ discipline }: { discipline?: DisciplineCode }) {
  const Icon = discipline === "BOAT" ? Ship : discipline === "SURFCASTING" ? Waves : discipline === "SPEARFISHING" ? Anchor : Fish;
  return <Icon size={21} strokeWidth={1.8} />;
}
export function FloatingMapControl({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button className="icon-action" type="button" onClick={onClick} aria-label={label} title={label}>{children}</button>;
}
export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [spots, setSpots] = useState<SpotView[]>([...demoSpots]);
  const [selected, setSelected] = useState<SpotView | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const [snap, setSnap] = useState<SheetSnap>("medium");
  const [layers, setLayers] = useState(false);
  const [marineStyle, setMarineStyle] = useState(true);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [forecast, setForecast] = useState<ForecastViewModel | null>(null);
  const [forecastError, setForecastError] = useState(false);
  const markerElements = useRef<Map<string, HTMLButtonElement>>(new Map());
  const baseStyle = useRef<maplibregl.StyleSpecification | null>(null);
  const cameraMoved = useRef(false);
  useEffect(() => {
    if (!containerRef.current) return;
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: containerRef.current, style: getDefaultTileProvider().styleUrl,
      center: [demoLocation.longitude, demoLocation.latitude], zoom: 12,
      attributionControl: { compact: true },
      locale: { "AttributionControl.ToggleAttribution": "Sources cartografiche" },
    });
    mapRef.current = map;
    let initialized = false;
    function frameSpots() {
      const bounds = new maplibregl.LngLatBounds();
      demoSpots.forEach(spot => bounds.extend([spot.location.longitude, spot.location.latitude]));
      const height = map.getContainer().clientHeight;
      const shortViewport = height < 600;
      setSnap(shortViewport ? "collapsed" : "medium");
      map.fitBounds(bounds, { padding: { top: 175, bottom: shortViewport ? 135 : height * .46 + 38, left: 55, right: 96 }, maxZoom: 12.5, duration: 0 });
    }
    map.on("load", () => {
      baseStyle.current = structuredClone(map.getStyle());
      paintMarine(map); setReady(true);
      initialized = true;
      frameSpots();
    });
    map.on("dragstart", () => { cameraMoved.current = true; });
    map.on("error", () => setMessage("Alcuni dettagli della mappa non sono disponibili. Puoi comunque consultare i tuoi spot."));
    map.on("click", (event: maplibregl.MapMouseEvent) => {
      cameraMoved.current = true;
      setPoint({ lat: event.lngLat.lat, lng: event.lngLat.lng }); setSelected(null); setName(""); setSnap("medium");
    });
    const resize = new ResizeObserver(() => { map.resize(); if (initialized && !cameraMoved.current) frameSpots(); }); resize.observe(containerRef.current);
    return () => { resize.disconnect(); mapRef.current = null; map.remove(); };
  }, []);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const markers: maplibregl.Marker[] = [];
    const roots: Root[] = [];
    const elements = markerElements.current;
    for (const spot of spots) {
      const element = document.createElement("button");
      element.type = "button"; element.className = "spot-marker";
      element.dataset.discipline = spot.discipline ?? "SHORE_SPINNING";
      element.setAttribute("aria-label", spot.name); element.title = spot.name;
      const root = createRoot(element); root.render(<FishingSpotMarker discipline={spot.discipline} />); roots.push(root);
      element.addEventListener("click", event => { event.stopPropagation(); selectSpot(spot); });
      markers.push(new maplibregl.Marker({ element }).setLngLat([spot.location.longitude, spot.location.latitude]).addTo(map));
      elements.set(spot.id, element);
    }
    return () => { markers.forEach(marker => marker.remove()); elements.clear(); queueMicrotask(() => roots.forEach(root => root.unmount())); };
  }, [spots, ready]);
  useEffect(() => { markerElements.current.forEach((element, id) => { element.dataset.selected = String(selected?.id === id); }); }, [selected, ready]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const discipline = selected.discipline ?? "SHORE_SPINNING";
    const params = new URLSearchParams({ lat: String(selected.location.latitude), lng: String(selected.location.longitude), label: selected.name, discipline, technique: techniqueFor[discipline], species: "SPIGOLA", days: "1" });
    fetch(`/api/forecast?${params}`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error("forecast"); return response.json(); }).then((data: ForecastViewModel) => setForecast(data)).catch(() => { if (!controller.signal.aborted) setForecastError(true); });
    return () => controller.abort();
  }, [selected]);
  function selectSpot(spot: SpotView) {
    cameraMoved.current = true;
    setSelected(spot); setPoint(null); setForecast(null); setForecastError(false); setSnap("medium");
    const map = mapRef.current;
    if (map) map.easeTo({ center: [spot.location.longitude, spot.location.latitude], offset: [0, -map.getContainer().clientHeight * .16], duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220 });
  }
  function locate() {
    cameraMoved.current = true;
    if (!navigator.geolocation) { setMessage("La posizione non e disponibile su questo dispositivo."); return; }
    navigator.geolocation.getCurrentPosition(position => {
      mapRef.current?.easeTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 13, duration: 220 });
      setMessage("Posizione aggiornata.");
    }, () => setMessage("Posizione non disponibile. Puoi scegliere un punto sulla mappa."));
  }
  function saveSpot() {
    if (!point) return;
    const spot = { id: crypto.randomUUID(), name: name.trim() || `Spot ${spots.length + 1}`, location: { latitude: point.lat, longitude: point.lng }, discipline: "SHORE_SPINNING" as const };
    setSpots(current => [...current, spot]); selectSpot(spot); setMessage("Punto aggiunto alla mappa.");
  }
  function changeStyle(marine: boolean) {
    setMarineStyle(marine); setLayers(false);
    const map = mapRef.current;
    if (!map || !baseStyle.current) return;
    if (marine) paintMarine(map);
    else for (const layer of baseStyle.current.layers) {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", layer.paint?.["background-color"] ?? "#f8f4f0");
      if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", layer.paint?.["fill-color"] ?? "#dddddd");
      if (layer.type === "line") map.setPaintProperty(layer.id, "line-color", layer.paint?.["line-color"] ?? "#bbbbbb");
      if (layer.type === "symbol" && layer.layout?.["text-field"]) {
        map.setPaintProperty(layer.id, "text-color", layer.paint?.["text-color"] ?? "#333333");
        map.setPaintProperty(layer.id, "text-halo-color", layer.paint?.["text-halo-color"] ?? "#ffffff");
      }
    }
  }
  const priorSessions = selected ? demoSessions.filter(session => session.primarySpot === selected.name).length : 0;
  const conditions = forecast?.current.snapshot;
  return <div className="map-shell">
    <div ref={containerRef} className="map-canvas" aria-label="Mappa dei tuoi spot" />
    <header className="map-header"><h1>Esplora il mare.</h1><p>Castiglione della Pescaia</p></header>
    <div className="map-controls" aria-label="Controlli mappa">
      <FloatingMapControl label="Vai alla mia posizione" onClick={locate}><LocateFixed size={20} /></FloatingMapControl>
      <FloatingMapControl label="Livelli mappa" onClick={() => setLayers(true)}><Layers size={20} /></FloatingMapControl>
      <FloatingMapControl label="Aumenta zoom" onClick={() => { cameraMoved.current = true; mapRef.current?.zoomIn({ duration: 180 }); }}><Plus size={20} /></FloatingMapControl>
      <FloatingMapControl label="Riduci zoom" onClick={() => { cameraMoved.current = true; mapRef.current?.zoomOut({ duration: 180 }); }}><Minus size={20} /></FloatingMapControl>
      <ThemeToggle />
    </div>
    {message ? <button className="map-status" onClick={() => setMessage("")} aria-label="Chiudi messaggio mappa">{message}</button> : null}
    <MapBottomSheet snap={snap} onSnap={setSnap}>
      <div className="map-sheet-heading"><div><h2>{selected?.name ?? (point ? "Nuovo spot" : "I tuoi spot")}</h2><p>{selected ? labelForDiscipline(selected.discipline ?? "SHORE_SPINNING") : point ? "Punto selezionato" : `${spots.length} luoghi privati`}</p></div>
        {selected || point ? <button className="icon-action" onClick={() => { setSelected(null); setPoint(null); }} aria-label="Torna agli spot" title="Torna agli spot"><ArrowLeft size={18} /></button> : <span className="spot-symbol"><Waves size={22} /></span>}
      </div>
      {snap !== "collapsed" ? point ? <div className="stack"><p className="help-text">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p><label>Nome dello spot<input value={name} onChange={event => setName(event.target.value)} placeholder={`Spot ${spots.length + 1}`} /></label><button className="primary-action" onClick={saveSpot}><Save size={18} />Salva spot</button></div> : selected ? <div className="spot-details">
        {!forecast && !forecastError ? <div className="skeleton skeleton-item" aria-label="Caricamento condizioni spot" /> : <div className="grid-2">
          <div className="metric"><span>Fishing Score</span><strong>{forecast?.current.score.finalScore ?? "N/D"}</strong></div>
          <div className="metric"><span>Profondita</span><strong>{conditions?.marine.depthM !== undefined ? `${conditions.marine.depthM} m` : "Non disponibile"}</strong></div>
          <div className="metric"><span>Onde</span><strong>{conditions?.marine.waveHeightM !== undefined ? `${conditions.marine.waveHeightM.toFixed(1)} m` : "Non disponibili"}</strong></div>
          <div className="metric"><span>Le tue uscite qui</span><strong>{priorSessions}</strong></div>
        </div>}
        {forecastError ? <p className="help-text">Alcuni dati del mare non sono momentaneamente disponibili.</p> : null}
        <Link className="primary-action" href={`/forecast?lat=${selected.location.latitude}&lng=${selected.location.longitude}&label=${encodeURIComponent(selected.name)}&discipline=${selected.discipline ?? "SHORE_SPINNING"}&technique=${techniqueFor[selected.discipline ?? "SHORE_SPINNING"]}`}>Previsioni dello spot<ArrowRight size={18} /></Link>
      </div> : <div className="spot-list">{spots.map(spot => <button className="spot-card" key={spot.id} onClick={() => selectSpot(spot)}><span className="spot-symbol"><FishingSpotMarker discipline={spot.discipline} /></span><div><strong>{spot.name}</strong><small>{labelForDiscipline(spot.discipline ?? "SHORE_SPINNING")}</small></div><ArrowRight size={16} /></button>)}</div> : null}
    </MapBottomSheet>
    <BottomSheet open={layers} onClose={() => setLayers(false)} title="Livelli mappa"><div className="choice-grid"><button className="choice-card" data-active={marineStyle} aria-pressed={marineStyle} onClick={() => changeStyle(true)}><Waves size={24} /><strong>Mappa marina</strong>{marineStyle ? <Check size={16} /> : null}</button><button className="choice-card" data-active={!marineStyle} aria-pressed={!marineStyle} onClick={() => changeStyle(false)}><Layers size={24} /><strong>Mappa stradale</strong>{!marineStyle ? <Check size={16} /> : null}</button></div><p className="help-text">Le curve di profondita non sono ancora disponibili per questa zona.</p></BottomSheet>
  </div>;
}
function paintMarine(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#20343a");
    if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", /water|ocean/i.test(layer.id) ? "#102c3b" : /park|wood|forest|landcover/i.test(layer.id) ? "#243f3e" : "#2a4146");
    if (layer.type === "line") map.setPaintProperty(layer.id, "line-color", /water/i.test(layer.id) ? "#426979" : "#476066");
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setPaintProperty(layer.id, "text-color", "#a7c3ce"); map.setPaintProperty(layer.id, "text-halo-color", "#15313c");
    }
  }
}
