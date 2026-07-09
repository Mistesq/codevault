import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { TopBar } from "@/components/dashboard/TopBar";
import { ItemDrawerProvider } from "@/components/items/item-drawer-context";
import {
  getDashboardCollections,
  getFavoriteCollections,
  getSelectableCollections,
} from "@/lib/db/collections";
import { getSidebarItemCounts, getSystemItemTypes } from "@/lib/db/items";
import { getSearchData } from "@/lib/db/search";
import { getCurrentUser, getEditorPreferences } from "@/lib/db/user";
import { CommandPaletteProvider } from "@/components/search/command-palette-context";
import { EditorPreferencesProvider } from "@/components/editor/editor-preferences-context";

/**
 * The authenticated app shell: top bar + sidebar around the page content.
 * Shared by every signed-in route (dashboard, profile, …) so they all carry the
 * same navigation. Verifies the session server-side (the proxy is only an
 * optimistic gate) and redirects to sign-in with the given callback otherwise.
 */
export async function AppShell({
  children,
  callbackUrl,
}: {
  children: React.ReactNode;
  callbackUrl: string;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=${callbackUrl}`);
  }

  const [
    itemTypes,
    counts,
    favoriteCollections,
    recentCollections,
    selectableCollections,
    searchData,
    user,
    editorPreferences,
  ] = await Promise.all([
    getSystemItemTypes(),
    getSidebarItemCounts(),
    getFavoriteCollections(),
    getDashboardCollections(5),
    getSelectableCollections(),
    getSearchData(),
    getCurrentUser(),
    getEditorPreferences(),
  ]);

  const sidebarData = {
    itemTypes,
    counts,
    favoriteCollections,
    recentCollections,
    user,
  };

  return (
    <SidebarProvider>
      <EditorPreferencesProvider initial={editorPreferences}>
        <ItemDrawerProvider
          collections={selectableCollections}
          isPro={session.user.isPro}
        >
          <CommandPaletteProvider
            items={searchData.items}
            collections={searchData.collections}
          >
            <div className="flex h-screen flex-col">
              <TopBar
                collections={selectableCollections}
                isPro={session.user.isPro}
              />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar data={sidebarData} />
                <main className="main-scroll flex-1 overflow-auto p-6">{children}</main>
              </div>
            </div>
          </CommandPaletteProvider>
        </ItemDrawerProvider>
      </EditorPreferencesProvider>
    </SidebarProvider>
  );
}
