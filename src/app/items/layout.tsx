import { AppShell } from "@/components/dashboard/AppShell";

// Item listing pages share the dashboard's app shell (top bar + sidebar) and
// read per-user data — render per request.
export const dynamic = "force-dynamic";

export default function ItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/items">{children}</AppShell>;
}
