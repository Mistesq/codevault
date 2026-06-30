"use client";

import Link from "next/link";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Search,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Brand } from "@/components/dashboard/Brand";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { useCommandPalette } from "@/components/search/command-palette-context";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import type { SelectableCollection } from "@/lib/db/collections";

// Top bar for the dashboard. The brand block on the left sits on the same row
// as the search and tracks the sidebar width. The search field opens the global
// command palette (Cmd/Ctrl+K); "New Item" opens the create-item dialog (with
// the user's collections for the assignment picker).
export function TopBar({
  collections,
}: {
  collections: SelectableCollection[];
}) {
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const { openPalette } = useCommandPalette();

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border">
      {/* Brand block — desktop only, width tracks the sidebar below it. */}
      <div
        className={cn(
          "hidden h-full shrink-0 items-center border-r border-border transition-[width] duration-200 md:flex",
          collapsed ? "w-16 justify-center px-0" : "w-64 justify-between px-3",
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" aria-label="Go to dashboard" className="overflow-hidden">
            <Brand />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* Right section: mobile menu + search + actions. */}
      <div className="flex flex-1 items-center gap-4 px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        >
          <Menu className="size-5" />
        </button>

        <button
          type="button"
          onClick={openPalette}
          aria-label="Search items and collections"
          className="relative mx-auto flex h-9 w-full max-w-2xl cursor-pointer items-center rounded-md border border-input bg-transparent pl-9 pr-12 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="truncate">Search snippets, prompts, commands…</span>
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        </button>

        <Link
          href="/pinned"
          aria-label="Pinned"
          title="Pinned"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pin className="size-4" />
        </Link>

        <Link
          href="/favorites"
          aria-label="Favorites"
          title="Favorites"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className="size-4" />
        </Link>

        <NewCollectionDialog />
        <NewItemDialog collections={collections} />
      </div>
    </header>
  );
}
