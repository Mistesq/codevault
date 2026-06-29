import { AppShell } from "@/components/dashboard/AppShell";

// Collection pages share the dashboard's app shell (top bar + sidebar) and read
// per-user data — render per request.
export const dynamic = "force-dynamic";

export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/collections">{children}</AppShell>;
}
