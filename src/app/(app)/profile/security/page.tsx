import { PasswordSettings } from "@/components/account/PasswordSettings";
import { requireAccount } from "@/infrastructure/supabase/account";
export default async function SecurityPage() { await requireAccount(); return <PasswordSettings />; }
