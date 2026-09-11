import { NewSessionFlow } from "@/components/sessions/NewSessionFlow";
import { PageHeader } from "@/components/ui/ProductPrimitives";
import { getSpots } from "@/infrastructure/repositories/user-data";
import { requireAccount } from "@/infrastructure/supabase/account";

export default async function NewSessionPage() {
  const [{ profile }, spots] = await Promise.all([requireAccount(), getSpots()]);
  return (
    <>
      <PageHeader title="Inizia sessione" />
      <NewSessionFlow spots={spots} initialLocation={profile.homeLocation} userId={profile.id} />
    </>
  );
}
