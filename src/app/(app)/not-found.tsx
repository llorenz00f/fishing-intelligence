import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/ProductPrimitives";
export default function NotFound() { return <EmptyState title="Non troviamo questa uscita"><span>Questa sessione non e presente nel diario disponibile.</span><Link className="secondary-action" href="/sessions"><ArrowLeft size={18} />Torna al diario</Link></EmptyState>; }
