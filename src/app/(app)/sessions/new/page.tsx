import { NewSessionFlow } from "@/components/sessions/NewSessionFlow";
import { PageHeader } from "@/components/ui/ProductPrimitives";

export default function NewSessionPage() {
  return (
    <>
      <PageHeader title="Inizia sessione" />
      <NewSessionFlow />
    </>
  );
}
