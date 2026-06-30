"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, FolderOpen, Pin } from "lucide-react";

import { useItemDrawer } from "@/components/items/item-drawer-context";
import { relativeTime } from "@/lib/dashboard-data";
import type { DashboardItem } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/favorites";
import {
  DEFAULT_FAVORITE_SORT,
  FAVORITE_SORT_OPTIONS,
  defaultDirFor,
  sortFavoriteCollections,
  sortFavoriteItems,
  type FavoriteSort,
  type FavoriteSortKey,
} from "@/lib/favorites-sort";
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

// A section heading like "ITEMS · 12" in the dense, mono style.
function SectionLabel({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="px-2 pb-1 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {title} <span className="text-muted-foreground/60">· {count}</span>
    </h2>
  );
}

// Compact, mono-styled sort control. Clicking the active key flips direction;
// clicking another key switches to it at its natural default direction.
function FavoritesSortControl({
  sort,
  onChange,
}: {
  sort: FavoriteSort;
  onChange: (sort: FavoriteSort) => void;
}) {
  function selectKey(key: FavoriteSortKey) {
    if (key === sort.key) {
      onChange({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      onChange({ key, dir: defaultDirFor(key) });
    }
  }

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      <span className="pr-1">Sort</span>
      {FAVORITE_SORT_OPTIONS.map((option) => {
        const active = option.value === sort.key;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => selectKey(option.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            {option.label}
            {active &&
              (sort.dir === "asc" ? (
                <ArrowUp className="size-3" />
              ) : (
                <ArrowDown className="size-3" />
              ))}
          </button>
        );
      })}
    </div>
  );
}

function ItemRow({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openItem(item);
    }
  }

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
      {item.isPinned && (
        <Pin className="size-3 shrink-0 text-muted-foreground" />
      )}
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

/**
 * The favorites page body: a compact, dev-focused list of favorited items and
 * collections in separate sections. Item rows open the shared ItemDrawer;
 * collection rows navigate to the collection page. Rendered only when there is
 * at least one favorite (the page handles the empty state).
 */
export function FavoritesList({
  items,
  collections,
}: {
  items: DashboardItem[];
  collections: FavoriteCollection[];
}) {
  const [sort, setSort] = useState<FavoriteSort>(DEFAULT_FAVORITE_SORT);

  const sortedItems = useMemo(
    () => sortFavoriteItems(items, sort),
    [items, sort],
  );
  const sortedCollections = useMemo(
    () => sortFavoriteCollections(collections, sort),
    [collections, sort],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end px-2">
        <FavoritesSortControl sort={sort} onChange={setSort} />
      </div>

      {sortedItems.length > 0 && (
        <section>
          <SectionLabel title="Items" count={sortedItems.length} />
          <div className="divide-y divide-border/60 border-y border-border/60">
            {sortedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {sortedCollections.length > 0 && (
        <section>
          <SectionLabel title="Collections" count={sortedCollections.length} />
          <div className="divide-y divide-border/60 border-y border-border/60">
            {sortedCollections.map((collection) => (
              <CollectionRow key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
