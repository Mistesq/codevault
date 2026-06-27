import { AppShell } from "@/components/dashboard/AppShell";

// The sidebar reads per-user data from the database — render per request.
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/dashboard">{children}</AppShell>;
}
