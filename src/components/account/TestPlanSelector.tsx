"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FlaskConical } from "lucide-react";
import { canSwitchTestPlan, plans, type AccountProfile } from "@/domain/account/access";
import { useAppearance } from "@/components/appearance/ThemeProvider";

export function TestPlanSelector({ account }: { account: AccountProfile }) {
  const [plan, setPlan] = useState(account.plan);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const { refreshProfile } = useAppearance();
  const router = useRouter();
  if (!canSwitchTestPlan(account)) return null;
  async function select(next: AccountProfile["plan"]) {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/profile/plan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPlan(result.plan); await refreshProfile(); router.refresh(); setMessage(`Piano ${result.plan} attivo.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Piano non aggiornato. Riprova."); }
    finally { setPending(false); }
  }
  return <section className="account-section"><div className="section-heading"><h2>Piano di test</h2><span className="account-badge"><FlaskConical size={14} />Modalita test</span></div>
    <p className="muted">Come {account.role === "admin" ? "admin" : "beta tester"} puoi cambiare piano liberamente per verificare le funzionalita.</p>
    <div className="appearance-segmented" role="group" aria-label="Piano di test">{plans.map(item => <button key={item} disabled={pending} aria-pressed={plan === item} onClick={() => void select(item)}>{plan === item ? <Check size={16} /> : null}{item}</button>)}</div>
    {message ? <p className="form-message" role="status">{message}</p> : null}
  </section>;
}
