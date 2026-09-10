import { Sparkles } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/ProductPrimitives";

export default function AssistantPage() {
  return (
    <>
      <PageHeader eyebrow="Consigli personali" title="Assistant">
        <p>Uno spazio per rileggere forecast, sessioni e pattern quando vuoi preparare la prossima uscita.</p>
      </PageHeader>
      <EmptyState title="Consigli in arrivo">
        <Sparkles size={18} /> Quando avrai piu storico, qui troverai suggerimenti basati sulle tue uscite reali.
      </EmptyState>
    </>
  );
}
