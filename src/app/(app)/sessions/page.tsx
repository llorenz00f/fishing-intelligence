import { SessionJournal } from "@/components/sessions/SessionJournal";
import { getSessions } from "@/infrastructure/repositories/user-data";
import { requireAccount } from "@/infrastructure/supabase/account";
export default async function SessionsPage() { const account = await requireAccount(); return <SessionJournal sessions={await getSessions()} userId={account.user.id} />; }
