import Link from "next/link";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { requireAccount } from "@/infrastructure/supabase/account";
import { TestPlanSelector } from "@/components/account/TestPlanSelector";
export default async function PlanPage() {
  const { profile } = await requireAccount();
  return <div className="profile-page"><Link href="/profile" className="appearance-back"><ArrowLeft size={17} />Profilo</Link><header className="appearance-heading"><div><p className="eyebrow">FISHING INTELLIGENCE</p><h1>Il tuo piano</h1></div><span className="account-badge"><Crown size={17} />{profile.plan}</span></header><TestPlanSelector account={profile} /><div className="plan-comparison">{[{ name: "FREE", features: ["Deep Ocean chiaro e scuro", "5 spot privati", "Diario e meteo reale", "Preferenze di accessibilita"] }, { name: "PRO", features: ["Tutte le palette premium", "Dynamic Weather", "Spot illimitati", "Insights avanzati"] }, { name: "CAPTAIN", features: ["Tutte le funzionalita PRO", "Piano CAPTAIN in test beta"] }].map(plan => <section key={plan.name}><h2>{plan.name}</h2><ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul></section>)}</div><p className="muted">Gli acquisti non sono ancora attivi. La modalita di test non comporta addebiti.</p></div>;
}
