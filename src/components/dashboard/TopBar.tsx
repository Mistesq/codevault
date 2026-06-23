"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/dashboard/Brand";
import { useSidebar } from "@/components/dashboard/sidebar-context";

// Top bar for the dashboard. The brand block on the left sits on the same row
// as the search and tracks the sidebar width. Search and "New Item" are
// display-only for now — interactivity arrives in later phases.
export function TopBar() {
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border">
      {/* Brand block — desktop only, width tracks the sidebar below it. */}
      <div
        className={cn(
          "hidden h-full shrink-0 items-center border-r border-border transition-[width] duration-200 md:flex",
          collapsed ? "w-16 justify-center px-0" : "w-64 justify-between px-3",
        )}
      >
        {!collapsed && <Brand />}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        >
          <Menu className="size-5" />
        </button>

        <div className="relative mx-auto w-full max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search snippets, prompts, commands…"
            aria-label="Search"
            className="pl-9 pr-12"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        </div>

        <Button className="shrink-0">
          <Plus className="size-4" />
          New Item
        </Button>
      </div>
    </header>
  );
}
