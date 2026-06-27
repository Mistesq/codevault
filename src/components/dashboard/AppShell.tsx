import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  getDashboardCollections,
  getFavoriteCollections,
} from "@/lib/db/collections";
import { getSidebarItemCounts, getSystemItemTypes } from "@/lib/db/items";
import { getCurrentUser } from "@/lib/db/user";

/**
 * The authenticated app shell: top bar + sidebar around the page content.
 * Shared by every signed-in route (dashboard, profile, …) so they all carry the
 * same navigation. Verifies the session server-side (the proxy is only an
 * optimistic gate) and redirects to sign-in with the given callback otherwise.
 */
export async function AppShell({
  children,
  callbackUrl,
}: {
  children: React.ReactNode;
  callbackUrl: string;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=${callbackUrl}`);
  }

  const [itemTypes, counts, favoriteCollections, recentCollections, user] =
    await Promise.all([
      getSystemItemTypes(),
      getSidebarItemCounts(),
      getFavoriteCollections(),
      getDashboardCollections(5),
      getCurrentUser(),
    ]);

  const sidebarData = {
    itemTypes,
    counts,
    favoriteCollections,
    recentCollections,
    user,
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar data={sidebarData} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
