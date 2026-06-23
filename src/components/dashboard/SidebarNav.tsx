"use client";

import type { ComponentType, CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Code2,
  File as FileIcon,
  FileText,
  Folder,
  Image as ImageIcon,
  LayoutGrid,
  Link as LinkIcon,
  Pin,
  Settings,
  Sparkles,
  Star,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { collections, currentUser, items, itemTypes } from "@/lib/mock-data";
import { useSidebar } from "./sidebar-context";

type IconComponent = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

// Resolve the icon name strings stored on each item type to components.
const TYPE_ICONS: Record<string, IconComponent> = {
  Code2,
  Sparkles,
  FileText,
  Terminal,
  File: FileIcon,
  Image: ImageIcon,
  Link: LinkIcon,
};

// Plural, lowercase slug for type routes, e.g. "Snippet" -> "/items/snippets".
function typeSlug(name: string) {
  return `${name.toLowerCase()}s`;
}

// ---------- Derived mock data (recomputed once at module load) ----------

const favoriteCount = items.filter((i) => i.isFavorite).length;
const pinnedCount = items.filter((i) => i.isPinned).length;

const favoriteCollections = collections.filter((c) => c.isFavorite);

// Order collections by the most recent activity of the items they contain.
const latestActivity = new Map<string, number>();
for (const item of items) {
  if (!item.collectionId) continue;
  const time = new Date(item.updatedAt).getTime();
  if (time > (latestActivity.get(item.collectionId) ?? 0)) {
    latestActivity.set(item.collectionId, time);
  }
}
const recentCollections = [...collections]
  .sort(
    (a, b) =>
      (latestActivity.get(b.id) ?? 0) - (latestActivity.get(a.id) ?? 0),
  )
  .slice(0, 5);

// ---------- Building blocks ----------

interface NavRowProps {
  href: string;
  icon: IconComponent;
  label: string;
  count?: number;
  // Optional data-driven accent for the icon (item type / collection color).
  color?: string;
  collapsed: boolean;
}

function NavRow({ href, icon: Icon, label, count, color, collapsed }: NavRowProps) {
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
      <Icon className="size-4 shrink-0" style={color ? { color } : undefined} />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
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

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-full flex-col">
      {/* Scrollable navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <NavRow href="/items" icon={LayoutGrid} label="All Items" count={items.length} collapsed={collapsed} />
        <NavRow href="/favorites" icon={Star} label="Favorites" count={favoriteCount} collapsed={collapsed} />
        <NavRow href="/pinned" icon={Pin} label="Pinned" count={pinnedCount} collapsed={collapsed} />
        <NavRow href="/recent" icon={Clock} label="Recently Used" collapsed={collapsed} />

        {!collapsed && <SectionLabel>Types</SectionLabel>}
        <div className={cn(collapsed && "mt-2 border-t border-sidebar-border pt-2")}>
          {itemTypes.map((type) => (
            <NavRow
              key={type.id}
              href={`/items/${typeSlug(type.name)}`}
              icon={TYPE_ICONS[type.icon] ?? FileIcon}
              label={type.name}
              color={type.color}
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
                icon={Folder}
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
                icon={Folder}
                label={collection.name}
                count={collection.itemCount}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer: upgrade prompt + user avatar area */}
      <div className="border-t border-sidebar-border p-2">
        {!currentUser.isPro && (
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
            title={collapsed ? currentUser.name : undefined}
          >
            {userInitials(currentUser.name)}
          </span>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{currentUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser.isPro ? "Pro plan" : "Free plan"}
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
