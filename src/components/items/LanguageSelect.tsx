"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { LANGUAGE_OPTIONS, type LanguageOption } from "@/lib/languages";

/**
 * Single-select dropdown for a code item's syntax-highlighting language. A
 * searchable combobox (Base UI) that portals out so it isn't clipped by the
 * create dialog or the drawer sheet. Public props stay string-based: the stored
 * `language` maps to a curated `{ value, label }` option internally, and a
 * legacy/free-text value that isn't in the list is surfaced as its own option
 * so it still displays and stays selectable.
 */
export function LanguageSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  // Surface a legacy/unknown stored value as an extra option so the trigger can
  // display it and Base UI can match the controlled value by reference.
  const items = React.useMemo<LanguageOption[]>(() => {
    if (value && !LANGUAGE_OPTIONS.some((o) => o.value === value)) {
      return [{ value, label: value }, ...LANGUAGE_OPTIONS];
    }
    return LANGUAGE_OPTIONS;
  }, [value]);

  const selected = React.useMemo(
    () => items.find((o) => o.value === value) ?? null,
    [items, value],
  );

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={(next: LanguageOption | null) => onChange(next?.value ?? "")}
      itemToStringLabel={(item: LanguageOption) => item.label}
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        className={cn(
          "flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm shadow-xs transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-popup-open:border-ring",
        )}
      >
        <Combobox.Value>
          {(current: LanguageOption | null) =>
            current ? (
              <span className="flex-1 truncate text-foreground">
                {current.label}
              </span>
            ) : (
              <span className="flex-1 text-muted-foreground">
                Select language
              </span>
            )
          }
        </Combobox.Value>
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
                placeholder="Search languages…"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Combobox.Empty>
              <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">
                No languages found.
              </p>
            </Combobox.Empty>
            <Combobox.List className="sidebar-scroll max-h-56 overflow-y-auto p-1">
              {(item: LanguageOption) => (
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
