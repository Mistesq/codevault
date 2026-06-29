import { AppShell } from "@/components/dashboard/AppShell";

// Settings shares the dashboard's app shell (top bar + sidebar) and reads
// per-user data — render per request.
export const dynamic = "force-dynamic";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/settings">{children}</AppShell>;
}
