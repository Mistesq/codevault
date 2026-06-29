"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SelectableCollection } from "@/lib/db/collections";

interface CollectionItem {
  value: string;
  label: string;
}

/**
 * Multi-select for assigning an item to zero, one, or several collections.
 * A compact combobox (Base UI): the trigger shows the chosen collections as
 * chips with a chevron; opening reveals a searchable, checkable list that flips
 * above/below to fit (it portals out, so it isn't clipped by the dialog). The
 * public props stay id-based — items are mapped to `{ value, label }` internally
 * so search matches on the collection name.
 */
export function CollectionMultiSelect({
  collections,
  selectedIds,
  onChange,
  disabled,
}: {
  collections: SelectableCollection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  // Stable per collections set so selected refs match list-item refs (Base UI
  // matches the controlled value by reference).
  const items = React.useMemo<CollectionItem[]>(
    () => collections.map((c) => ({ value: c.id, label: c.name })),
    [collections],
  );

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedIds.includes(item.value)),
    [items, selectedIds],
  );

  if (collections.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        No collections yet. Create one from the top bar.
      </p>
    );
  }

  return (
    <Combobox.Root
      items={items}
      multiple
      value={selectedItems}
      onValueChange={(next: CollectionItem[]) =>
        onChange(next.map((item) => item.value))
      }
      disabled={disabled}
    >
      <Combobox.Trigger
        className={cn(
          "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm shadow-xs transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-popup-open:border-ring",
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          <Combobox.Value>
            {(value: CollectionItem[]) =>
              value.length === 0 ? (
                <span className="text-muted-foreground">
                  Select collections
                </span>
              ) : (
                value.map((item) => (
                  <span
                    key={item.value}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
                  >
                    {item.label}
                  </span>
                ))
              )
            }
          </Combobox.Value>
        </div>
        <Combobox.Icon className="shrink-0 text-muted-foreground">
          <ChevronsUpDown className="size-4" />
        </Combobox.Icon>
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup className="w-(--anchor-width) max-h-(--available-height) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center gap-2 border-b border-border px-2.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input
                placeholder="Search collections…"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {/* The wrapper is always present (a live region); only its children
                render when the list is empty — so keep padding on the inner node
                so the wrapper collapses to 0 height when there are results. */}
            <Combobox.Empty>
              <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">
                No collections found.
              </p>
            </Combobox.Empty>
            <Combobox.List className="sidebar-scroll max-h-56 overflow-y-auto p-1">
              {(item: CollectionItem) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-primary">
                    <Combobox.ItemIndicator>
                      <Check className="size-4" />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className="truncate">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
