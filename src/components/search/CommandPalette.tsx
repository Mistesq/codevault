"use client";

import { useRouter } from "next/navigation";
import { Folder } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TypeIcon, typeLabel } from "@/lib/type-icons";
import { useItemDrawer } from "@/components/items/item-drawer-context";
import type { DashboardItem } from "@/lib/db/items";
import type { SearchCollection } from "@/lib/db/search";

/** Short, single-line preview of an item's content for the result row + search. */
function itemPreview(item: DashboardItem): string {
  const raw =
    item.contentType === "FILE"
      ? (item.fileName ?? "")
      : (item.url ?? item.content ?? "");
  return raw.replace(/\s+/g, " ").trim().slice(0, 100);
}

/**
 * Stricter replacement for cmdk's default (subsequence) scorer, which is far too
 * liberal here: typing "test" subsequence-matches almost every item once the
 * long content preview is in its keywords. Instead, every whitespace-separated
 * term must appear as a contiguous substring across the item's keywords; the
 * score rewards earlier matches so the most relevant results rank first. cmdk
 * ignores the `value` (it's just a stable `item-/collection-<id>` handle) since
 * all searchable text lives in `keywords`.
 */
function searchFilter(
  _value: string,
  search: string,
  keywords?: string[],
): number {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  const haystack = (keywords ?? []).join(" ").toLowerCase();
  let score = 0;
  for (const term of terms) {
    const index = haystack.indexOf(term);
    if (index === -1) return 0; // every term must match somewhere
    score += 1 - index / (haystack.length + 1);
  }
  return score / terms.length;
}

/**
 * The global command palette dialog. Renders the pre-fetched items and
 * collections into two grouped, fuzzy-searchable sections (cmdk filters on each
 * item's `keywords`). Selecting an item opens its drawer; selecting a collection
 * navigates to its page.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  collections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DashboardItem[];
  collections: SearchCollection[];
}) {
  const router = useRouter();
  const { openItem } = useItemDrawer();

  function handleSelectItem(item: DashboardItem) {
    onOpenChange(false);
    openItem(item);
  }

  function handleSelectCollection(id: string) {
    onOpenChange(false);
    router.push(`/collections/${id}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      filter={searchFilter}
      title="Search"
      description="Search your items and collections"
    >
      <CommandInput placeholder="Search items and collections…" autoFocus />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {items.length > 0 && (
          <CommandGroup heading="Items">
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={`item-${item.id}`}
                keywords={[
                  item.title,
                  typeLabel(item.type.name),
                  itemPreview(item),
                  ...item.tags,
                ]}
                onSelect={() => handleSelectItem(item)}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted"
                  style={
                    item.type.color ? { color: item.type.color } : undefined
                  }
                >
                  <TypeIcon name={item.type.icon} className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {typeLabel(item.type.name)}
                    {itemPreview(item) && ` · ${itemPreview(item)}`}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {collections.length > 0 && (
          <CommandGroup heading="Collections">
            {collections.map((collection) => (
              <CommandItem
                key={collection.id}
                value={`collection-${collection.id}`}
                keywords={[collection.name]}
                onSelect={() => handleSelectCollection(collection.id)}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Folder className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{collection.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
