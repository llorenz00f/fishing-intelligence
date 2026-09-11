import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { PwaController } from "@/components/pwa/PwaController";
import { requireAccount } from "@/infrastructure/supabase/account";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  await requireAccount();
  return (
    <>
      <PwaController />
      <AppShell>{children}</AppShell>
    </>
  );
}
