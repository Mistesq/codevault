import { AppShell } from "@/components/dashboard/AppShell";

// Favorites shares the dashboard's app shell (top bar + sidebar) and reads
// per-user data — render per request.
export const dynamic = "force-dynamic";

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell callbackUrl="/favorites">{children}</AppShell>;
}
