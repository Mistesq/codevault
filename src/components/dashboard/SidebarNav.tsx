"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Clock,
  Home,
  LayoutGrid,
  Pin,
  Sparkles,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import type { DashboardCollection, SidebarCollection } from "@/lib/db/collections";
import type { SidebarItemCounts, SidebarItemType } from "@/lib/db/items";
import type { CurrentUser } from "@/lib/db/user";
import { getTypeIcon, typeLabel, type IconComponent } from "@/lib/type-icons";
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

// File and Image item types are Pro-only.
function isProType(name: string) {
  return ["file", "image"].includes(name.toLowerCase());
}

// Clean, subtle "PRO" badge for Pro-only sidebar entries.
function ProBadge() {
  return (
    <Badge
      variant="secondary"
      className="h-4 border-transparent px-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground transition-colors group-hover/navrow:border-border"
    >
      PRO
    </Badge>
  );
}

// ---------- Building blocks ----------

interface NavRowProps {
  href: string;
  label: string;
  // Either a lucide icon component or a custom leading element (e.g. a dot).
  icon?: IconComponent;
  leading?: ReactNode;
  // Optional trailing badge (e.g. a "PRO" tag), hidden when collapsed.
  badge?: ReactNode;
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
  badge,
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
        "group/navrow flex items-center gap-3 rounded-md px-3 py-[0.45rem] text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
      {!collapsed && badge}
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

// A labelled list of collection NavRows (Favorite / Recent). `leading` renders
// the per-collection leading element (a star, a type-colored dot, …). Renders
// nothing when the list is empty. Callers gate on `!collapsed` since these
// label-heavy sections are hidden in the icon rail.
function CollectionSection<
  T extends { id: string; name: string; itemCount: number },
>({
  label,
  collections,
  leading,
  collapsed,
}: {
  label: string;
  collections: T[];
  leading: (collection: T) => ReactNode;
  collapsed: boolean;
}) {
  if (collections.length === 0) return null;
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      {collections.map((collection) => (
        <NavRow
          key={collection.id}
          href={`/collections/${collection.id}`}
          leading={leading(collection)}
          label={collection.name}
          count={collection.itemCount}
          collapsed={collapsed}
        />
      ))}
    </>
  );
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
      <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-2">
        <NavRow href="/dashboard" icon={Home} label="Dashboard" collapsed={collapsed} />
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
              badge={isProType(type.name) ? <ProBadge /> : undefined}
              count={type.count}
              color={type.color ?? undefined}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Collection sections are label-heavy, so hide them in the icon rail. */}
        {!collapsed && (
          <CollectionSection
            label="Favorite Collections"
            collections={favoriteCollections}
            leading={() => (
              <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
            )}
            collapsed={collapsed}
          />
        )}

        {!collapsed && (
          <CollectionSection
            label="Recent Collections"
            collections={recentCollections}
            leading={(collection) => <TypeDot color={collection.borderColor} />}
            collapsed={collapsed}
          />
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
            nativeButton={false}
            render={<Link href="/upgrade" />}
            onClick={() => setMobileOpen(false)}
            className={cn("mb-2 w-full", collapsed && "px-0")}
            title={collapsed ? "Upgrade to Pro" : undefined}
          >
            <Sparkles className="size-4 shrink-0" />
            {!collapsed && "Upgrade to Pro"}
          </Button>
        )}

        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </div>
  );
}
