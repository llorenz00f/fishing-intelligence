"use client";
import { useRef, type ReactNode } from "react";
export type SheetSnap = "collapsed" | "medium" | "expanded";
const snaps: SheetSnap[] = ["collapsed", "medium", "expanded"];
export function MapBottomSheet({ snap, onSnap, children }: { snap: SheetSnap; onSnap: (snap: SheetSnap) => void; children: ReactNode }) {
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  return <aside className="map-bottom-sheet" data-snap={snap} aria-label="Dettagli spot">
    <button className="map-sheet-handle" type="button" aria-label={snap === "expanded" ? "Riduci pannello spot" : "Espandi pannello spot"} aria-expanded={snap !== "collapsed"}
      onPointerDown={event => { drag.current = { y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current && Math.abs(event.clientY - drag.current.y) > 12) drag.current.moved = true; }}
      onPointerUp={event => {
        if (drag.current?.moved) {
          const delta = event.clientY - drag.current.y;
          onSnap(snaps[Math.max(0, Math.min(2, snaps.indexOf(snap) + (delta < 0 ? 1 : -1)))]);
          suppressClick.current = true;
        }
        drag.current = null;
      }}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); onSnap(snaps[Math.max(0, Math.min(2, snaps.indexOf(snap) + (event.key === "ArrowUp" ? 1 : -1)))]); } }}
      onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onSnap(snaps[(snaps.indexOf(snap) + 1) % 3]); }}
    ><span className="sheet-handle" /></button>
    <div className="map-sheet-content">{children}</div>
  </aside>;
}
