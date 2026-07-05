"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, FolderOpen } from "lucide-react";

import { useItemDrawer } from "@/components/items/item-drawer-context";
import { useActivateOnEnter } from "@/components/items/use-activate-on-enter";
import { PinIndicator } from "@/components/items/PinIndicator";
import { Pagination } from "@/components/ui/pagination";
import { TabNav } from "@/components/ui/tab-nav";
import { relativeTime } from "@/lib/dashboard-data";
import type { DashboardItem } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/favorites";
import {
  defaultDirFor,
  FAVORITE_SORT_OPTIONS,
  isDefaultFavoriteSort,
  serializeFavoriteSort,
  type FavoriteSort,
} from "@/lib/favorites-sort";
import type { ListTab } from "@/lib/list-tabs";
import type { Paginated } from "@/lib/pagination";
import { TypeIcon, typeLabel } from "@/lib/type-icons";
import { cn } from "@/lib/utils";

// Shared row chrome: dense, monospace, subtle hover, clean dividers (no cards).
const ROW_CLASS =
  "group flex w-full items-center gap-3 px-2 py-1.5 text-left font-mono text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset";

// Small uppercase type badge — colored text on a faint chip.
function Badge({ label, color }: { label: string; color?: string | null }) {
  return (
    <span
      className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline"
      style={color ? { color } : undefined}
    >
      {label}
    </span>
  );
}

// Build a /favorites href, omitting defaults (items tab, default sort, page 1)
// so the common URLs stay clean.
function favoritesHref({
  tab,
  sort,
  page,
}: {
  tab: ListTab;
  sort: FavoriteSort;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (tab === "collections") params.set("tab", "collections");
  if (!isDefaultFavoriteSort(sort)) {
    params.set("sort", serializeFavoriteSort(sort));
  }
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/favorites?${qs}` : "/favorites";
}

// Params (minus page) a pager must preserve on every page link.
function pagerExtraParams(
  tab: ListTab,
  sort: FavoriteSort,
): Record<string, string> {
  const extra: Record<string, string> = {};
  if (tab === "collections") extra.tab = "collections";
  if (!isDefaultFavoriteSort(sort)) {
    extra.sort = serializeFavoriteSort(sort);
  }
  return extra;
}

// Compact, mono-styled sort control rendered as navigation links. Clicking the
// active key flips direction; clicking another key switches to it at its natural
// default direction. Sort stays on the active tab and resets pagination. The
// leading icon + "Sort" label reads as a label (not another option); the active
// key is shown by brighter text plus its direction arrow — no button-like fill.
function FavoritesSortControl({
  tab,
  sort,
}: {
  tab: ListTab;
  sort: FavoriteSort;
}) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider">
      <span className="flex items-center gap-1 text-muted-foreground/50">
        <ArrowUpDown className="size-3" />
        Sort
      </span>
      <div className="flex items-center gap-3">
        {FAVORITE_SORT_OPTIONS.map((option) => {
          const active = option.value === sort.key;
          const next: FavoriteSort = active
            ? { key: option.value, dir: sort.dir === "asc" ? "desc" : "asc" }
            : { key: option.value, dir: defaultDirFor(option.value) };
          return (
            <Link
              key={option.value}
              href={favoritesHref({ tab, sort: next })}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground/60 hover:text-foreground",
              )}
            >
              {option.label}
              {active &&
                (sort.dir === "asc" ? (
                  <ArrowUp className="size-3" />
                ) : (
                  <ArrowDown className="size-3" />
                ))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();
  const handleKeyDown = useActivateOnEnter<HTMLButtonElement>(() =>
    openItem(item),
  );

  return (
    <button
      type="button"
      onClick={() => openItem(item)}
      onKeyDown={handleKeyDown}
      className={ROW_CLASS}
    >
      <TypeIcon
        name={item.type.icon}
        className="size-4 shrink-0 text-muted-foreground"
        style={item.type.color ? { color: item.type.color } : undefined}
      />
      <span className="min-w-0 flex-1 truncate text-foreground">
        {item.title}
      </span>
      <PinIndicator pinned={item.isPinned} className="size-3" />
      <Badge label={typeLabel(item.type.name)} color={item.type.color} />
      <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
        {relativeTime(item.updatedAt)}
      </span>
    </button>
  );
}

function CollectionRow({ collection }: { collection: FavoriteCollection }) {
  return (
    <Link href={`/collections/${collection.id}`} className={ROW_CLASS}>
      <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-foreground">
        {collection.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {collection.itemCount}{" "}
        {collection.itemCount === 1 ? "item" : "items"}
      </span>
      <Badge label="Collection" />
      <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
        {relativeTime(collection.updatedAt)}
      </span>
    </Link>
  );
}

// Empty-tab note (the whole-page empty state is handled by the page).
function EmptyTab({ label }: { label: string }) {
  return (
    <p className="px-2 py-6 text-center font-mono text-xs text-muted-foreground">
      No favorited {label} yet.
    </p>
  );
}

/**
 * The favorites page body: an Items / Collections tab split. Only one list shows
 * at a time; sorting and pagination are URL-driven (server-sorted,
 * server-paginated). Item rows open the shared ItemDrawer; collection rows
 * navigate to the collection page. Rendered only when there is at least one
 * favorite (the page handles the global empty state).
 */
export function FavoritesList({
  activeTab,
  items,
  collections,
  sort,
}: {
  activeTab: ListTab;
  items: Paginated<DashboardItem>;
  collections: Paginated<FavoriteCollection>;
  sort: FavoriteSort;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <TabNav
          items={[
            {
              label: "Items",
              href: favoritesHref({ tab: "items", sort }),
              count: items.totalCount,
              active: activeTab === "items",
            },
            {
              label: "Collections",
              href: favoritesHref({ tab: "collections", sort }),
              count: collections.totalCount,
              active: activeTab === "collections",
            },
          ]}
        />
        <div className="pb-2">
          <FavoritesSortControl tab={activeTab} sort={sort} />
        </div>
      </div>

      {activeTab === "items" ? (
        items.totalCount > 0 ? (
          <section>
            <div className="divide-y divide-border/60 border-y border-border/60">
              {items.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
            <Pagination
              page={items.page}
              totalPages={items.totalPages}
              baseHref="/favorites"
              pageParam="page"
              extraParams={pagerExtraParams("items", sort)}
            />
          </section>
        ) : (
          <EmptyTab label="items" />
        )
      ) : collections.totalCount > 0 ? (
        <section>
          <div className="divide-y divide-border/60 border-y border-border/60">
            {collections.items.map((collection) => (
              <CollectionRow key={collection.id} collection={collection} />
            ))}
          </div>
          <Pagination
            page={collections.page}
            totalPages={collections.totalPages}
            baseHref="/favorites"
            pageParam="page"
            extraParams={pagerExtraParams("collections", sort)}
          />
        </section>
      ) : (
        <EmptyTab label="collections" />
      )}
    </div>
  );
}
