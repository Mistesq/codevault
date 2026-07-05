import { Clock } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/pagination";
import { TabNav } from "@/components/ui/tab-nav";
import { getPaginatedCollections } from "@/lib/db/collections";
import { getAllItemsPaginated } from "@/lib/db/items";
import { parseListTab, type ListTab } from "@/lib/list-tabs";
import { parsePageParam } from "@/lib/pagination";

// User-specific data fetched from the database — render per request.
export const dynamic = "force-dynamic";

// Build a /recent href, omitting defaults (items tab, page 1) for clean URLs.
function recentHref(tab: ListTab, page?: number): string {
  const params = new URLSearchParams();
  if (tab === "collections") params.set("tab", "collections");
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/recent?${qs}` : "/recent";
}

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parsePageParam(params.page);

  const explicitTab =
    params.tab === "items" || params.tab === "collections"
      ? (params.tab as ListTab)
      : undefined;
  const requestedTab = parseListTab(params.tab, "items");

  // Both ordered updatedAt desc (pure recency). Only the active tab uses `page`;
  // the other is fetched at page 1 just for its total count (tab badge).
  const [items, collections] = await Promise.all([
    getAllItemsPaginated(requestedTab === "items" ? page : 1, {
      pinnedFirst: false,
    }),
    getPaginatedCollections(requestedTab === "collections" ? page : 1),
  ]);

  const isEmpty = items.totalCount === 0 && collections.totalCount === 0;

  const activeTab: ListTab =
    explicitTab ??
    (items.totalCount === 0 && collections.totalCount > 0
      ? "collections"
      : "items");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Clock className="size-5" />}
        iconClassName="text-sky-400"
        title="Recently Used"
        subtitle="Your most recently updated items and collections"
      />

      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Create an item or collection to see it here.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <TabNav
            items={[
              {
                label: "Items",
                href: recentHref("items"),
                count: items.totalCount,
                active: activeTab === "items",
              },
              {
                label: "Collections",
                href: recentHref("collections"),
                count: collections.totalCount,
                active: activeTab === "collections",
              },
            ]}
          />

          {activeTab === "items" ? (
            items.totalCount > 0 ? (
              <section>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
                <Pagination
                  page={items.page}
                  totalPages={items.totalPages}
                  baseHref="/recent"
                  pageParam="page"
                />
              </section>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No recent items yet.
              </p>
            )
          ) : collections.totalCount > 0 ? (
            <section>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {collections.items.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
              <Pagination
                page={collections.page}
                totalPages={collections.totalPages}
                baseHref="/recent"
                pageParam="page"
                extraParams={{ tab: "collections" }}
              />
            </section>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent collections yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
