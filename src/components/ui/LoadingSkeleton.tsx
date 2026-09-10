export function LoadingSkeleton({ kind = "dashboard" }: { kind?: "dashboard" | "forecast" | "sessions" | "insights" | "spot" }) {
  if (kind === "spot") return <div className="skeleton skeleton-map" role="status" aria-label="Caricamento mappa" />;
  return <div className="loading-view" role="status" aria-label="Caricamento in corso" aria-busy="true">
    <div className="skeleton skeleton-line" /><div className="skeleton skeleton-title" />
    {kind === "dashboard" || kind === "forecast" ? <div className="skeleton skeleton-score" /> : <div className="grid-3">{[0, 1, 2].map(i => <div className="skeleton skeleton-item" key={i} />)}</div>}
    <div className="grid-2">{[0, 1, 2, 3].map(i => <div className="skeleton skeleton-item" key={i} />)}</div>
  </div>;
}
