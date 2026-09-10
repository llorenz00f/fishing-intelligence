import type { ReactNode } from "react";
import { AlertTriangle, ChevronDown, CircleOff, Sunrise, WifiOff } from "lucide-react";
export function PageHeader({ eyebrow, title, children, actions, compact = false }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode; compact?: boolean }) {
  return <header className={compact ? "page-title page-title--compact" : "page-title"}><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{children ? <div>{children}</div> : null}</div>{actions ? <div className="page-title-actions">{actions}</div> : null}</header>;
}
export function FilterChip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="filter-chip" onClick={onClick} type="button">{children}<ChevronDown size={13} /></button>;
}
export function Metric({ label, value, icon, helper, horizontal = false }: { label: string; value: ReactNode; icon?: ReactNode; helper?: ReactNode; horizontal?: boolean }) {
  return <div className={horizontal ? "metric metric--horizontal" : "metric"}>{icon ? <span className="metric-icon">{icon}</span> : null}<div className="stack-tight"><span>{label}</span><strong>{value}</strong>{helper ? <small className="help-text">{helper}</small> : null}</div></div>;
}
export function StatCard({ label, value, helper }: { label: string; value: ReactNode; helper?: ReactNode }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong>{helper ? <small className="help-text">{helper}</small> : null}</div>;
}
export function BestFishingWindow({ window }: { window: string }) {
  return <div className="best-window"><Sunrise size={24} /><div><span>La fascia migliore</span><strong>{window}</strong></div></div>;
}
export function PersonalInsightCard({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return <article className="personal-insight-card">{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h3>{title}</h3><p>{children}</p></article>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <section className="empty-state"><CircleOff size={28} /><h2>{title}</h2><div className="state-content muted">{children}</div></section>;
}
export function ErrorState({ title, children }: { title: string; children: ReactNode }) {
  return <section className="error-state" role="alert"><AlertTriangle size={28} /><h2>{title}</h2><div className="state-content">{children}</div></section>;
}
export function OfflineIndicator({ pendingCount = 0 }: { pendingCount?: number }) {
  return <div className="offline-banner" role="status"><WifiOff size={16} />{pendingCount > 0 ? `${pendingCount} eventi da inviare quando torni online` : "Sei offline. Gli eventi restano sul dispositivo."}</div>;
}
