import { LiveSessionLogger } from "@/components/sessions/LiveSessionLogger";
import { getSession } from "@/infrastructure/repositories/user-data";
import { requireAccount } from "@/infrastructure/supabase/account";

export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireAccount();
  const session = await getSession(id);
  return (
    <>
      <LiveSessionLogger
        sessionId={id}
        userId={account.user.id}
        initialSession={
          session
            ? {
                discipline: session.discipline,
                technique: session.technique,
                targetSpecies: session.targetSpecies,
                spot: session.primarySpot,
                startTime: session.startTime,
                endTime: session.endTime,
              }
            : undefined
        }
      />
    </>
  );
}
