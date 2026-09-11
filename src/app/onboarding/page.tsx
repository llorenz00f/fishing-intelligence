import { OnboardingFlow } from "@/components/auth/OnboardingFlow";
import { requireAccount } from "@/infrastructure/supabase/account";

export default async function OnboardingPage() {
  const { profile } = await requireAccount();
  return (
    <main className="onboarding-page">
      <OnboardingFlow account={profile} />
    </main>
  );
}
