"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Anchor, Eye, EyeOff, Mail, Waves } from "lucide-react";
import { ThemeToggle } from "@/components/app/ThemeToggle";

type AuthMode = "login" | "register" | "forgot";

const modeCopy: Record<AuthMode, { title: string; action: string; helper: string; story: string }> = {
  login: {
    title: "Bentornato",
    action: "Entra",
    helper: "Ritrova previsioni, spot e sessioni nel tuo spazio personale.",
    story: "Le decisioni migliori nascono dal mare di oggi e dalle uscite che hai gia vissuto.",
  },
  register: {
    title: "Crea il tuo account",
    action: "Inizia",
    helper: "Spot e coordinate restano privati per default.",
    story: "Costruisci uno storico utile: catture, abboccate e giornate lente hanno tutte valore.",
  },
  forgot: {
    title: "Recupera accesso",
    action: "Invia email",
    helper: "Ti inviamo un link per impostare una nuova password.",
    story: "Il tuo diario resta al suo posto. Serve solo rientrare.",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const copy = modeCopy[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register" && password !== confirmPassword) { setMessage("Le password non coincidono."); return; }
    setPending(true);
    setMessage(null);
    try {
      const action = mode === "register" ? "signup" : mode === "forgot" ? "recover" : "login";
      const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { email, password, confirmPassword, isBetaTester } : mode === "forgot" ? { email } : { email, password }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "Accesso non riuscito. Riprova."); return; }
      if (result.next === "/dashboard" || result.next === "/onboarding") { window.location.assign(result.next); return; }
      setMessage(result.message || "Controlla la tua email e conferma l'account per completare la registrazione.");
    } catch {
      setMessage("Connessione interrotta. I tuoi dati restano nel modulo, puoi riprovare.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-story">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark">
              <Waves size={20} />
            </span>
            <span>Fishing Intelligence</span>
          </Link>
          <div>
            <p className="eyebrow">IL TUO MARE, IL TUO DIARIO</p>
            <h1>{copy.story}</h1>
          </div>
          <p>Score spiegabile, diario personale e spot privati in una sola esperienza pensata per pescare meglio.</p>
        </section>

        <section className="auth-panel">
          <div className="auth-brand-row"><Link href="/" className="brand-lockup">
            <span className="brand-mark">
              <Waves size={20} />
            </span>
            <span>Fishing Intelligence</span>
          </Link><ThemeToggle /></div>
          <div>
            <p className="eyebrow">Accesso personale</p>
            <h1>{copy.title}</h1>
            <p className="muted">{copy.helper}</p>
          </div>
          <form className="stack" onSubmit={submit}>
            <label>
              Email
              <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {mode !== "forgot" ? (
              <label>
                Password
                <div className="password-field"><input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                /><button className="icon-action" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Nascondi password" : "Mostra password"} title={showPassword ? "Nascondi password" : "Mostra password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
              </label>
            ) : null}
            {mode === "register" ? <>
              <label>Conferma password<input type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
              <label className="beta-checkbox"><input type="checkbox" checked={isBetaTester} onChange={event => setIsBetaTester(event.target.checked)} /><span><strong>Beta tester</strong><small>Voglio partecipare al programma beta e testare in anteprima le funzionalita dell&apos;app.</small></span></label>
            </> : null}
            <button className="primary-action" type="submit" disabled={pending}>
              <Mail size={18} />
              {pending ? "Attendi..." : copy.action}
            </button>
          </form>
          {message ? <p className="form-message" role="status">{message}</p> : null}
          <nav className="auth-links" aria-label="Link account">
            {mode !== "login" ? <Link href="/login">Accedi</Link> : null}
            {mode !== "register" ? <Link href="/register">Crea account</Link> : null}
            {mode !== "forgot" ? <Link href="/forgot-password">Recupera password</Link> : null}
          </nav>
          <p className="fine-print">
            <Anchor size={14} /> Lo score non garantisce catture e non sostituisce i bollettini ufficiali.
          </p>
        </section>
      </div>
    </main>
  );
}
