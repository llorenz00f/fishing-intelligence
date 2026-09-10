import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { PwaController } from "@/components/pwa/PwaController";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaController />
      <AppShell>{children}</AppShell>
    </>
  );
}
