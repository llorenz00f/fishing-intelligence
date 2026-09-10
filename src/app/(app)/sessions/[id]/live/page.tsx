import { LiveSessionLogger } from "@/components/sessions/LiveSessionLogger";
import { demoSessions } from "@/data/demo";

export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = demoSessions.find((item) => item.id === id);
  return (
    <>
      <LiveSessionLogger
        sessionId={id}
        initialSession={
          session
            ? {
                discipline: session.discipline,
                technique: session.technique,
                targetSpecies: session.targetSpecies,
                spot: session.primarySpot,
              }
            : undefined
        }
      />
    </>
  );
}
