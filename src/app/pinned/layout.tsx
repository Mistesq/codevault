import { AppShell } from "@/components/dashboard/AppShell";

// Pinned shares the dashboard's app shell (top bar + sidebar) and reads
// per-user data — render per request.
export const dynamic = "force-dynamic";

export default function PinnedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/pinned">{children}</AppShell>;
}
