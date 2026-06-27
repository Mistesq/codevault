import { AppShell } from "@/components/dashboard/AppShell";

// Profile shares the dashboard's app shell (top bar + sidebar) and reads
// per-user data — render per request.
export const dynamic = "force-dynamic";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/profile">{children}</AppShell>;
}
