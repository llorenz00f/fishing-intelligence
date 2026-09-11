"use client";

import Link from "next/link";
import { ArrowRight, Crown, LogOut, Palette, UserRound, Save, ShieldCheck, FlaskConical, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useAppearance } from "./ThemeProvider";
import { getTheme } from "@/domain/appearance/registry";
import type { AccountProfile } from "@/domain/account/access";
import { TestPlanSelector } from "@/components/account/TestPlanSelector";
import { useRouter } from "next/navigation";

export function ProfileSettings({ account }: { account: AccountProfile }) {
  const { preferences, refreshProfile } = useAppearance();
  const [displayName, setDisplayName] = useState(account.displayName);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function signOut() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Uscita non riuscita. Riprova.");
      window.location.replace("/login");
    } catch { setMessage("Uscita non riuscita. Riprova."); setPending(false); }
  }
  async function save() {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refreshProfile(); router.refresh(); setMessage("Profilo aggiornato.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Profilo non salvato."); }
    finally { setPending(false); }
  }
  return <div className="profile-page"><header className="page-title"><h1>Profilo</h1></header>
    <div className="profile-identity"><span className="profile-avatar"><UserRound size={28} /></span><div><h2>{account.displayName}</h2><div className="account-badges"><span className="account-badge">{account.plan}</span>{account.isBetaTester ? <span className="account-badge"><FlaskConical size={14} />Beta tester</span> : null}{account.role === "admin" ? <span className="account-badge"><ShieldCheck size={14} />Admin</span> : null}</div></div></div>
    <section className="account-section"><h2>Account</h2><form className="stack" onSubmit={event => { event.preventDefault(); void save(); }}><label>Email<input type="email" value={account.email} readOnly /></label><label>Nome visualizzato<input value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={80} /></label><p className="help-text">Ruolo: {account.role === "admin" ? "Admin" : "Utente"} · {account.isBetaTester ? "Programma beta attivo" : "Account standard"}</p><button className="secondary-action" disabled={pending}><Save size={18} />Salva profilo</button></form></section>
    <TestPlanSelector account={account} />
    <nav className="profile-settings-links" aria-label="Impostazioni profilo"><Link href="/profile/appearance"><Palette size={22} /><span><strong>Aspetto</strong><small>{getTheme(preferences.themeId).name}</small></span><ArrowRight size={19} /></Link><Link href="/profile/plan"><Crown size={22} /><span><strong>Il tuo piano</strong><small>{account.plan}</small></span><ArrowRight size={19} /></Link></nav>
    <section className="account-section"><h2>Preferenze</h2><dl className="account-units"><div><dt>Sistema</dt><dd>Metrico</dd></div><div><dt>Vento</dt><dd>Nodi</dd></div><div><dt>Temperatura</dt><dd>Celsius</dd></div></dl><Link className="text-action" href="/onboarding">Area e preferenze di pesca<ArrowRight size={17} /></Link></section>
    <section className="account-section"><h2>Sicurezza</h2><a className="text-action" href="/profile/security"><LockKeyhole size={18} />Cambia password</a><button className="secondary-action" disabled={pending} onClick={signOut}><LogOut size={18} />Esci</button></section>
    {message ? <p role="alert">{message}</p> : null}
  </div>;
}
