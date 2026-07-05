import { Clock, Folder, Pin } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { getDashboardCollections } from "@/lib/db/collections";
import {
  getDashboardStats,
  getPinnedItems,
  getRecentItems,
} from "@/lib/db/items";
import { DASHBOARD_RECENT_ITEMS_LIMIT } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, pinnedItems, recentCollections, recentItems] =
    await Promise.all([
      getDashboardStats(),
      getPinnedItems(),
      getDashboardCollections(),
      getRecentItems(DASHBOARD_RECENT_ITEMS_LIMIT),
    ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <StatsCards stats={stats} />

      {pinnedItems.length > 0 && (
        <section>
          <SectionHeading icon={Pin} title="Pinned Items" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {recentCollections.length > 0 && (
        <section>
          <SectionHeading icon={Folder} title="Recent Collections" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      )}

      {recentItems.length > 0 && (
        <section>
          <SectionHeading icon={Clock} title="Recent Items" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
