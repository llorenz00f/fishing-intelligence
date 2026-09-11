"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, MapPin } from "lucide-react";
import type { LocationPoint } from "@/types/product";
import { saveForecastLocation } from "@/domain/forecast/location";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppearance } from "@/components/appearance/ThemeProvider";

export function ForecastLocation({ location, onSelect, autoRefresh = false }: { location: LocationPoint | null; onSelect?: (value: LocationPoint) => void; autoRefresh?: boolean }) {
  const router = useRouter();
  const { clearForecast, profile } = useAppearance();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!autoRefresh) return;
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const interval = setInterval(refresh, 10 * 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh); };
  }, [autoRefresh, router]);
  function select(value: LocationPoint) {
    setMessage(""); setOpen(false);
    if (onSelect) { onSelect(value); return; }
    saveForecastLocation({ ...value, label: value.label || "Area selezionata" }, profile.userId);
    clearForecast(); startTransition(() => router.refresh());
  }
  function locate() {
    if (!navigator.geolocation) { setMessage("Posizione non disponibile. Puoi inserire le coordinate."); return; }
    setLocating(true); setMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocating(false);
      select({ latitude: coords.latitude, longitude: coords.longitude, label: `La mia posizione (${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)})` });
    }, error => {
      setLocating(false);
      setMessage(error.code === 1 ? "Accesso alla posizione negato. Puoi inserire le coordinate." : "Posizione non disponibile. Riprova o inserisci le coordinate.");
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 });
  }
  return <>
    <div className="forecast-location-controls" aria-busy={locating || pending}>
      <button className="text-action" onClick={() => setOpen(true)} disabled={locating || pending}><MapPin size={16} />Cambia posizione</button>
      <button className="text-action" onClick={locate} disabled={locating || pending}><LocateFixed size={16} />{locating ? "Localizzazione..." : "Usa la mia posizione"}</button>
    </div>
    {message ? <p className="help-text" role="status">{message}</p> : null}
    {open ? <BottomSheet open onClose={() => setOpen(false)} title="Posizione meteo"><form className="stack" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      select({ latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")), label: String(form.get("label")) });
    }}><label>Localita<input name="label" defaultValue={location?.label} maxLength={100} required /></label>
      <div className="grid-2"><label>Latitudine<input name="latitude" type="number" step="any" min={-90} max={90} defaultValue={location?.latitude} required /></label><label>Longitudine<input name="longitude" type="number" step="any" min={-180} max={180} defaultValue={location?.longitude} required /></label></div>
      <button className="primary-action" type="submit"><MapPin size={18} />Usa questa posizione</button></form></BottomSheet> : null}
  </>;
}
