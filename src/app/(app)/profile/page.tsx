import { ProfileSettings } from "@/components/appearance/ProfileSettings";
import { requireAccount } from "@/infrastructure/supabase/account";
export default async function ProfilePage() { const { profile } = await requireAccount(); return <ProfileSettings account={profile} />; }
