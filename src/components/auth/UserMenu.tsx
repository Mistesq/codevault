"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, LogOut, Settings, User as UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/db/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";

/**
 * Sidebar footer user control: avatar + name/email that opens a dropdown with
 * links to the profile page and a sign-out action. Collapses to just the avatar
 * in the icon rail.
 */
export function UserMenu({
  user,
  collapsed,
}: {
  user: CurrentUser;
  collapsed: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={collapsed ? user.name : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none aria-expanded:bg-sidebar-accent",
          collapsed && "justify-center px-0",
        )}
      >
        <UserAvatar name={user.name} image={user.image} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 overflow-hidden">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email || (user.isPro ? "Pro plan" : "Free plan")}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              {user.name}
            </span>
            {user.email && (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserIcon />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
