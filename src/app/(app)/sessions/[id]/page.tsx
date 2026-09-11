import { LocalSessionDetail } from "@/components/sessions/LocalSessionDetail";
import { getSession } from "@/infrastructure/repositories/user-data";
import { requireAccount } from "@/infrastructure/supabase/account";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireAccount();
  return <LocalSessionDetail sessionId={id} userId={account.user.id} initialSession={await getSession(id)} />;
}
