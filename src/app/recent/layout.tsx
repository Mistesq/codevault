import { AppShell } from "@/components/dashboard/AppShell";

// Recently Used shares the dashboard's app shell (top bar + sidebar) and reads
// per-user data — render per request.
export const dynamic = "force-dynamic";

export default function RecentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/recent">{children}</AppShell>;
}
