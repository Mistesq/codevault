"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import type { DashboardItem, ItemDetail } from "@/lib/db/items";
import type { SelectableCollection } from "@/lib/db/collections";
import { ItemDrawer } from "@/components/items/ItemDrawer";

interface ItemDrawerContextValue {
  /** Open the drawer for a card and fetch its full detail. */
  openItem: (item: DashboardItem) => void;
  /** Apply a freshly-saved detail so the drawer reflects edits immediately. */
  applyUpdatedDetail: (detail: ItemDetail) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

export function useItemDrawer(): ItemDrawerContextValue {
  const ctx = useContext(ItemDrawerContext);
  if (!ctx) {
    throw new Error("useItemDrawer must be used within an ItemDrawerProvider");
  }
  return ctx;
}

/**
 * Bridges the server-rendered item grids to a single client-side drawer: holds
 * the open state, the clicked card's data (shown instantly), and the detail
 * fetched on click from /api/items/[id] (skeleton until it arrives). Lives in
 * the app shell so it covers both the dashboard and the items list pages.
 */
export function ItemDrawerProvider({
  children,
  collections,
}: {
  children: React.ReactNode;
  collections: SelectableCollection[];
}) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<DashboardItem | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Guards against an out-of-order response when a second card is clicked
  // before the first fetch resolves — only the latest request may apply.
  const requestId = useRef(0);

  const openItem = useCallback((next: DashboardItem) => {
    const id = ++requestId.current;
    setItem(next);
    setDetail(null);
    setError(false);
    setLoading(true);
    setOpen(true);

    fetch(`/api/items/${next.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json() as Promise<ItemDetail>;
      })
      .then((data) => {
        if (id !== requestId.current) return;
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    // Invalidate any in-flight fetch so a late response can't reopen content.
    if (!next) requestId.current++;
  }, []);

  // After a save, refresh both the detail (content/language/url/collection) and
  // the card-level item (title/description/tags/favorite/pin/updatedAt) shown in
  // the header — an ItemDetail is a superset of DashboardItem.
  const applyUpdatedDetail = useCallback((next: ItemDetail) => {
    setItem(next);
    setDetail(next);
  }, []);

  return (
    <ItemDrawerContext.Provider value={{ openItem, applyUpdatedDetail }}>
      {children}
      <ItemDrawer
        open={open}
        onOpenChange={handleOpenChange}
        item={item}
        detail={detail}
        collections={collections}
        loading={loading}
        error={error}
        onUpdated={applyUpdatedDetail}
        onDeleted={() => handleOpenChange(false)}
      />
    </ItemDrawerContext.Provider>
  );
}
