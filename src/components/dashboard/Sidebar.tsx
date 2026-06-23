"use client";

import { PanelLeftClose, PanelLeftOpen, Vault, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SidebarNav } from "./SidebarNav";
import { useSidebar } from "./sidebar-context";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 overflow-hidden", collapsed && "justify-center")}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Vault className="size-4" />
      </span>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="truncate text-sm font-semibold leading-tight">CodeVault</p>
          <p className="truncate text-xs text-muted-foreground leading-tight">
            Knowledge Hub
          </p>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop: static sidebar that collapses to an icon rail. */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && <Brand collapsed={collapsed} />}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        <SidebarNav collapsed={collapsed} />
      </aside>

      {/* Mobile: overlay drawer. */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
          <Brand collapsed={false} />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <SidebarNav collapsed={false} />
      </aside>
    </>
  );
}
