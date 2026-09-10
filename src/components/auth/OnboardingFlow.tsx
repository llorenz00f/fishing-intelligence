"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Anchor, Check, ChevronLeft, ChevronRight, Fish, MapPin, Save, Ship, Waves } from "lucide-react";
import { disciplines, species } from "@/data/catalog";

const steps = ["Profilo", "Area", "Discipline", "Specie", "Unita"];
const questions = ["Come ti chiami?", "Qual e il tuo mare?", "Come peschi?", "Che specie cerchi?", "Le tue unita di misura."];
const disciplineIcons = { SURFCASTING: Waves, SHORE_SPINNING: Fish, BOAT: Ship, SPEARFISHING: Anchor };

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [area, setArea] = useState("Castiglione della Pescaia");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(["SHORE_SPINNING"]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(["SPIGOLA"]);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function save() {
    try {
    localStorage.setItem(
      "fishing-intelligence:onboarding",
      JSON.stringify({
        displayName,
        area,
        selectedDisciplines,
        selectedSpecies,
        preferredUnits: {
          system: "metric",
          wind: "knots",
          temperature: "celsius",
        },
        onboardingCompleted: true,
      }),
    );
    setSaved(true);
    } catch {
      setMessage("Il dispositivo non consente di salvare le preferenze. Riprova dopo aver controllato lo spazio disponibile.");
    }
  }

  return (
    <section className="onboarding-panel">
      <div className="progress-steps">
        <div>
          <p className="eyebrow">IL TUO PROFILO · {step + 1} / 5</p>
          <h1>{questions[step]}</h1>
        </div>
        <div className="bar-track" aria-label={`Avanzamento ${progress}%`}>
          <div className="bar-fill" style={{ "--score": progress } as CSSProperties} />
        </div>
        <div className="progress-labels" aria-hidden="true">
          {steps.map((item, index) => (
            <span key={item} data-active={index === step}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <div className="stack">
          <p className="muted">Il nome serve solo a personalizzare il tuo spazio.</p>
          <label>
            Nome visualizzato
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Lorenzo" />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="stack">
          <p className="muted">Scegli l&apos;area che vuoi vedere per prima quando apri l&apos;app.</p>
          <label>
            Area principale di pesca
            <input value={area} onChange={(event) => setArea(event.target.value)} />
          </label>
          <button className="secondary-action" type="button" onClick={() => {
            if (!navigator.geolocation) { setMessage("Posizione non disponibile."); return; }
            navigator.geolocation.getCurrentPosition(position => { setArea(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`); setMessage(""); }, () => setMessage("Non riusciamo a leggere la posizione. Puoi indicare la tua zona."));
          }}>
            <MapPin size={18} />
            Usa posizione
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="choice-grid">
          {disciplines.map((discipline) => { const Icon = disciplineIcons[discipline.code]; return (
            <button
              className="choice-card"
              data-active={selectedDisciplines.includes(discipline.code)}
              aria-pressed={selectedDisciplines.includes(discipline.code)}
              key={discipline.code}
              type="button"
              onClick={() => toggle(selectedDisciplines, discipline.code, setSelectedDisciplines)}
            >
              <Icon size={28} /><strong>{discipline.label}</strong>
              {selectedDisciplines.includes(discipline.code) ? <Check size={16} /> : null}
            </button>
          ); })}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="choice-grid">
          {species.slice(0, 9).map((item) => (
            <button
              className="choice-card"
              data-active={selectedSpecies.includes(item.code)}
              aria-pressed={selectedSpecies.includes(item.code)}
              key={item.code}
              type="button"
              onClick={() => toggle(selectedSpecies, item.code, setSelectedSpecies)}
            >
              <strong>{item.commonName}</strong>
              <span>{item.scientificName}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid-3">
          <div className="metric">
            <span>Sistema</span>
            <strong>Metrico</strong>
          </div>
          <div className="metric">
            <span>Vento e corrente</span>
            <strong>Nodi</strong>
          </div>
          <div className="metric">
            <span>Temperatura</span>
            <strong>Celsius</strong>
          </div>
        </div>
      ) : null}

      {message ? <p className="form-message" role="status">{message}</p> : null}
      {saved ? <p className="form-message">Le tue preferenze sono salvate su questo dispositivo.</p> : null}

      <div className="button-row button-row--stretch">
        <button className="secondary-action" type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ChevronLeft size={18} />
          Indietro
        </button>
        {step < steps.length - 1 ? (
          <button className="primary-action" type="button" onClick={() => setStep(step + 1)}>
            Avanti
            <ChevronRight size={18} />
          </button>
        ) : (
          <button className="primary-action" type="button" onClick={save}>
            <Save size={18} />
            Salva profilo
          </button>
        )}
      </div>
      {saved ? (
        <Link className="secondary-action" href="/dashboard">
          <Check size={18} />
          Vai alla dashboard
        </Link>
      ) : null}
    </section>
  );
}
