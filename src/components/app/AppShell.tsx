"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, House, LockKeyhole, Map, Play, Sparkles, Waves } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/forecast", label: "Forecast", icon: CalendarDays },
  { href: "/map", label: "Mappa", icon: Map },
  { href: "/sessions", label: "Sessioni", icon: BookOpen },
  { href: "/insights", label: "Insights", icon: Sparkles },
] as const;

export function BottomNavigation({ pathname }: { pathname: string }) {
  return <nav className="bottom-nav" aria-label="Navigazione mobile">{navItems.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} data-active={active} aria-current={active ? "page" : undefined}><span className="nav-symbol"><Icon size={22} strokeWidth={active ? 2.3 : 1.7} /></span><span>{label}</span></Link>;
  })}</nav>;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const live = pathname.endsWith("/live");
  const map = pathname === "/map";
  return <div className="app-shell" data-map={map} data-live={live}>
    <a href="#main-content" className="skip-link">Vai al contenuto</a>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-lockup"><span className="brand-mark"><Waves size={24} /></span><span>Fishing<br />Intelligence</span></Link>
      <p className="nav-caption">IL TUO MARE</p>
      <nav className="side-nav" aria-label="Navigazione principale">{navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} data-active={active} aria-current={active ? "page" : undefined}><Icon size={21} /><span>{label}</span></Link>;
      })}</nav>
      <Link href="/sessions/new" className="primary-action"><Play size={18} />Inizia sessione</Link>
      <div className="sidebar-status"><ThemeToggle /><span><LockKeyhole size={14} />Il tuo diario, privato.</span></div>
    </aside>
    <main id="main-content" className="app-main">
      {!map && !live ? <div className="mobile-brand"><Link href="/dashboard" className="brand-lockup"><Waves size={24} /><span>Fishing Intelligence</span></Link><ThemeToggle /></div> : null}
      <div className="route-content" key={pathname}>{children}</div>
    </main>
    {!live ? <BottomNavigation pathname={pathname} /> : null}
  </div>;
}
