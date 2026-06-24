import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { TopBar } from "@/components/dashboard/TopBar";
import {
  getDashboardCollections,
  getFavoriteCollections,
} from "@/lib/db/collections";
import { getSidebarItemCounts, getSystemItemTypes } from "@/lib/db/items";
import { getCurrentUser } from "@/lib/db/user";

// The sidebar reads per-user data from the database — render per request.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
