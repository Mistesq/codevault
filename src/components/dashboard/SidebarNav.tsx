"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Clock,
  LayoutGrid,
  Pin,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DashboardCollection, SidebarCollection } from "@/lib/db/collections";
import type { SidebarItemCounts, SidebarItemType } from "@/lib/db/items";
import type { CurrentUser } from "@/lib/db/user";
import { getTypeIcon, type IconComponent } from "@/lib/type-icons";
import { useSidebar } from "./sidebar-context";

export interface SidebarData {
  itemTypes: SidebarItemType[];
  counts: SidebarItemCounts;
  favoriteCollections: SidebarCollection[];
  recentCollections: DashboardCollection[];
  user: CurrentUser;
}

// Plural, lowercase slug for type routes, e.g. "snippet" -> "/items/snippets".
function typeSlug(name: string) {
  return `${name.toLowerCase()}s`;
}

// Capitalize the first letter for display ("snippet" -> "Snippet", "URL" stays).
function typeLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ---------- Building blocks ----------

interface NavRowProps {
  href: string;
  label: string;
  // Either a lucide icon component or a custom leading element (e.g. a dot).
  icon?: IconComponent;
  leading?: ReactNode;
  count?: number;
  // Optional data-driven accent for the icon (item type / collection color).
  color?: string;
  collapsed: boolean;
}

function NavRow({
  href,
  label,
  icon: Icon,
  leading,
  count,
  color,
  collapsed,
}: NavRowProps) {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
        active && "bg-sidebar-accent text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {/* Inline color is data-driven (per-type/collection) so it can't be a static class. */}
      {leading ??
        (Icon ? (
          <Icon className="size-4 shrink-0" style={color ? { color } : undefined} />
        ) : null)}
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </Link>
  );
}

// Small filled circle in the collection's most-used item type color.
function TypeDot({ color }: { color: string | null }) {
  const style: CSSProperties | undefined = color
    ? { backgroundColor: color }
    : undefined;
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <span
        className={cn("size-2.5 rounded-full", !color && "bg-muted-foreground")}
        style={style}
      />
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function userInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------- Sidebar content ----------

export function SidebarNav({
  collapsed,
  data,
}: {
  collapsed: boolean;
  data: SidebarData;
}) {
  const { setMobileOpen } = useSidebar();
  const { itemTypes, counts, favoriteCollections, recentCollections, user } =
    data;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <NavRow href="/items" icon={LayoutGrid} label="All Items" count={counts.total} collapsed={collapsed} />
        <NavRow href="/favorites" icon={Star} label="Favorites" count={counts.favorites} collapsed={collapsed} />
        <NavRow href="/pinned" icon={Pin} label="Pinned" count={counts.pinned} collapsed={collapsed} />
        <NavRow href="/recent" icon={Clock} label="Recently Used" collapsed={collapsed} />

        {!collapsed && <SectionLabel>Types</SectionLabel>}
        <div className={cn(collapsed && "mt-2 border-t border-sidebar-border pt-2")}>
          {itemTypes.map((type) => (
            <NavRow
              key={type.id}
              href={`/items/${typeSlug(type.name)}`}
              icon={getTypeIcon(type.icon)}
              label={typeLabel(type.name)}
              count={type.count}
              color={type.color ?? undefined}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Collection sections are label-heavy, so hide them in the icon rail. */}
        {!collapsed && favoriteCollections.length > 0 && (
          <>
            <SectionLabel>Favorite Collections</SectionLabel>
            {favoriteCollections.map((collection) => (
              <NavRow
                key={collection.id}
                href={`/collections/${collection.id}`}
                leading={
                  <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
                }
                label={collection.name}
                count={collection.itemCount}
                collapsed={collapsed}
              />
            ))}
          </>
        )}

        {!collapsed && recentCollections.length > 0 && (
          <>
            <SectionLabel>Recent Collections</SectionLabel>
            {recentCollections.map((collection) => (
              <NavRow
                key={collection.id}
                href={`/collections/${collection.id}`}
                leading={<TypeDot color={collection.borderColor} />}
                label={collection.name}
                count={collection.itemCount}
                collapsed={collapsed}
              />
            ))}
          </>
        )}

        {!collapsed && (
          <Link
            href="/collections"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ChevronRight className="size-3.5 shrink-0" />
            View all collections
          </Link>
        )}
      </nav>

      {/* Footer: upgrade prompt + user avatar area */}
      <div className="border-t border-sidebar-border p-2">
        {!user.isPro && (
          <Button
            variant="secondary"
            className={cn("mb-2 w-full", collapsed && "px-0")}
            title={collapsed ? "Upgrade to Pro" : undefined}
          >
            <Sparkles className="size-4 shrink-0" />
            {!collapsed && "Upgrade to Pro"}
          </Button>
        )}

        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2",
            collapsed && "justify-center px-0",
          )}
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground"
            title={collapsed ? user.name : undefined}
          >
            {userInitials(user.name)}
          </span>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.isPro ? "Pro plan" : "Free plan"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Settings"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Settings className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
