import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Lock, Radar, ShieldCheck, Sparkles, Waves } from "lucide-react";

export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <Image
          src="/hero-mediterranean.png"
          alt="Costa mediterranea all'alba con mare leggibile"
          fill
          priority
          className="hero-image"
          sizes="100vw"
        />
        <nav className="top-nav" aria-label="Navigazione pubblica">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark">
              <Waves size={20} />
            </span>
            <span>Fishing Intelligence</span>
          </Link>
          <div className="nav-actions">
            <Link className="ghost-action" href="/login">
              Accedi
            </Link>
            <Link className="secondary-action" href="/register">
              Inizia gratis
            </Link>
          </div>
        </nav>
        <div className="hero-content">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.78)" }}>
            Il tuo mare. Le tue uscite. Le tue decisioni.
          </p>
          <h1>Fishing Intelligence</h1>
          <p>
            Fishing Intelligence analizza mare, meteo, tecnica, specie e le tue sessioni passate per aiutarti a scegliere
            il momento migliore per pescare.
          </p>
          <div className="nav-actions">
            <Link className="primary-action" href="/register">
              <Sparkles size={18} />
              Inizia gratis
            </Link>
            <Link className="ghost-action" href="/dashboard">
              Esplora l&apos;app
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-band">
        <div className="section-inner">
          <div className="section-heading">
            <h2>Previsioni, score e diario nello stesso flusso.</h2>
            <p className="muted">Pensato per il Mediterraneo e per decisioni rapide prima di uscire.</p>
          </div>
          <div className="grid-3">
            {[
              ["Come funziona", "Combina dati meteo e marini, tecnica e specie in uno score spiegabile."],
              ["Discipline", "Surfcasting, spinning da costa, barca e pesca subacquea con profili separati."],
              ["Pattern personali", "Le uscite senza catture restano dati utili per capire cosa non ha funzionato."],
            ].map(([title, detail]) => (
              <article className="card" key={title}>
                <p className="eyebrow">{title}</p>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-band" style={{ background: "#eaf5f1" }}>
        <div className="section-inner grid-3">
          <article className="score-card">
            <div className="score-main">
              <div className="score-number" style={{ "--score": 86 } as CSSProperties}>
                <strong>86</strong>
              </div>
              <div>
                <p className="eyebrow">Esempio score</p>
                <h2>Molto favorevole</h2>
                <p className="muted">Spinning da costa - Spigola - Alba</p>
              </div>
            </div>
            <p className="muted">Lo score rappresenta compatibilita stimata delle condizioni e non garantisce catture.</p>
          </article>
          {[
            [Radar, "Fattori reali", "Ogni contributo deriva dal motore di scoring, non da numeri casuali."],
            [Lock, "Spot privati", "Coordinate e note restano nel tuo spazio personale."],
            [ShieldCheck, "Sicurezza chiara", "Lo score aiuta a decidere, ma non sostituisce i bollettini ufficiali."],
          ].map(([Icon, title, detail]) => (
            <article className="card" key={String(title)}>
              <Icon size={26} color="var(--ocean)" />
              <h3>{String(title)}</h3>
              <p>{String(detail)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-band">
        <div className="section-inner grid-3">
          <article className="card">
            <p className="eyebrow">Piani</p>
            <h3>Free, Pro, Captain</h3>
            <p>Parti con lo score e il diario, poi aggiungi finestre piu estese quando ti servono.</p>
          </article>
          <article className="card">
            <p className="eyebrow">FAQ</p>
            <h3>Usa intelligenza artificiale per lo score?</h3>
            <p>No. Lo score e spiegabile: mostra quali condizioni stanno aiutando o frenando l&apos;uscita.</p>
          </article>
          <article className="card">
            <p className="eyebrow">Spot</p>
            <h3>Posso salvare punti privati?</h3>
            <p>Si. La mappa permette di salvare punti personali senza renderli pubblici.</p>
          </article>
        </div>
      </section>

      <footer className="landing-band disclaimer">
        <div className="section-inner">
          Le informazioni fornite hanno finalita informative e ricreative. Non costituiscono previsione certa di cattura,
          bollettino ufficiale, assistenza alla navigazione o valutazione professionale della sicurezza.
        </div>
      </footer>
    </main>
  );
}
