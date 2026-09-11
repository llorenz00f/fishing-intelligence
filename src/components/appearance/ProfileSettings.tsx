"use client";

import Link from "next/link";
import { ArrowRight, Crown, LogOut, Palette, UserRound } from "lucide-react";
import { useState } from "react";
import { useAppearance } from "./ThemeProvider";
import { getTheme } from "@/domain/appearance/registry";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";

export function ProfileSettings() {
  const { profile, preferences, refreshProfile } = useAppearance();
  const [message, setMessage] = useState("");
  async function signOut() {
    const result = await createSupabaseBrowserClient()?.auth.signOut();
    if (result?.error) setMessage("Uscita non riuscita. Riprova."); else await refreshProfile();
  }
  return <div className="profile-page"><header className="page-title"><h1>Profilo</h1></header>
    <div className="profile-identity"><span className="profile-avatar"><UserRound size={28} /></span><div><h2>{profile.displayName || "Il tuo spazio personale"}</h2><p className="muted">{profile.userId ? `Piano ${profile.plan}` : "Modalita ospite"}</p></div></div>
    <nav className="profile-settings-links" aria-label="Impostazioni profilo"><Link href="/profile/appearance"><Palette size={22} /><span><strong>Aspetto</strong><small>{getTheme(preferences.themeId).name}</small></span><ArrowRight size={19} /></Link><Link href="/profile/plan"><Crown size={22} /><span><strong>Il tuo piano</strong><small>{profile.plan}</small></span><ArrowRight size={19} /></Link></nav>
    {profile.userId ? <button className="secondary-action" onClick={signOut}><LogOut size={18} />Esci</button> : <Link href="/login" className="primary-action">Accedi al tuo profilo<ArrowRight size={18} /></Link>}
    {message ? <p role="alert">{message}</p> : null}
  </div>;
}
