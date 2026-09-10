"use client";
import { RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/ui/ProductPrimitives";
export default function AppError({ retry }: { retry: () => void }) {
  return <ErrorState title="Questi dati non sono disponibili"><span>Non siamo riusciti a caricare questa schermata. Riprova tra poco.</span><button className="primary-action" onClick={retry}><RefreshCw size={18} />Riprova</button></ErrorState>;
}
