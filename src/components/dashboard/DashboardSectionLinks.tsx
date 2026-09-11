import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Map } from "lucide-react";

const links = [
  { href: "/forecast", label: "Forecast completo", detail: "Confronta i prossimi giorni", icon: CalendarDays },
  { href: "/map", label: "Esplora la Mappa", detail: "Trova il prossimo spot", icon: Map },
  { href: "/sessions", label: "Il tuo diario", detail: "Rivedi le tue sessioni", icon: BookOpen },
] as const;

export function DashboardSectionLinks() {
  return <nav className="dashboard-section-links" aria-label="Esplora Fishing Intelligence">
    {links.map(({ href, label, detail, icon: Icon }) => <Link href={href} key={href}><Icon size={19} /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight size={17} /></Link>)}
  </nav>;
}
