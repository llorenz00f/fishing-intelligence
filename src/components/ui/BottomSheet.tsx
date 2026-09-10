"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty("--sheet-viewport", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--keyboard-offset", `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={ref} className="bottom-sheet" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="bottom-sheet-inner">
      <span className="sheet-handle" aria-hidden="true" />
      <header className="sheet-title"><h2 id={titleId}>{title}</h2><button type="button" className="icon-action" onClick={onClose} aria-label="Chiudi" title="Chiudi"><X size={20} /></button></header>
      <div className="sheet-content">{children}</div>
    </div>
  </dialog>;
}
