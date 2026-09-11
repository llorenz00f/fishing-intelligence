"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
export function PasswordSettings() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <div className="profile-page"><Link href="/profile" className="appearance-back"><ArrowLeft size={17} />Profilo</Link><header className="page-title"><h1>Cambia password</h1></header><form className="stack" onSubmit={async event => {
    event.preventDefault(); if (password !== confirmPassword) { setMessage("Le password non coincidono."); return; }
    setPending(true); setMessage("");
    try { const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, confirmPassword }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(result.message); setPassword(""); setConfirmPassword(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Password non aggiornata."); } finally { setPending(false); }
  }}><label>Nuova password<div className="password-field"><input type={visible ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={128} required autoComplete="new-password" /><button type="button" className="icon-action" aria-label={visible ? "Nascondi password" : "Mostra password"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><label>Conferma password<input type={visible ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} required autoComplete="new-password" /></label><button className="primary-action" disabled={pending}><Save size={18} />{pending ? "Salvataggio..." : "Aggiorna password"}</button></form>{message ? <p className="form-message" role="status">{message}</p> : null}</div>;
}
