import { AppShell } from "@/components/dashboard/AppShell";

// The upgrade page shares the dashboard's app shell (top bar + sidebar) and
// reads per-user plan state — render per request.
export const dynamic = "force-dynamic";

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/upgrade">{children}</AppShell>;
}
