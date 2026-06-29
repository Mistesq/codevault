"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { SidebarNav, type SidebarData } from "./SidebarNav";
import { useSidebar } from "./sidebar-context";

export function Sidebar({ data }: { data: SidebarData }) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop: static sidebar that collapses to an icon rail. Its brand
          header lives in the top bar so the two line up. */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarNav collapsed={collapsed} data={data} />
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
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            onClick={() => setMobileOpen(false)}
            className="overflow-hidden"
          >
            <Brand />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <SidebarNav collapsed={false} data={data} />
      </aside>
    </>
  );
}
