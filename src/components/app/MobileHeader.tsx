"use client";
import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MapPin, RefreshCw } from "lucide-react";
export function MobileHeader({ title, location, children, refresh = false }: { title: string; location?: string; children?: ReactNode; refresh?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <header className="mobile-header"><div>{location ? <p className="location-label"><MapPin size={14} />{location}</p> : null}<h1>{title}</h1>{children}</div>{refresh ? <button className="icon-action" aria-label="Aggiorna condizioni" title="Aggiorna condizioni" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={18} className={pending ? "refreshing" : ""} /></button> : null}</header>;
}
