"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { CommandPalette } from "@/components/search/CommandPalette";
import type { DashboardItem } from "@/lib/db/items";
import type { SearchCollection } from "@/lib/db/search";

interface CommandPaletteContextValue {
  /** Open the global command palette (e.g. from the top-bar search). */
  openPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }
  return ctx;
}

/**
 * Holds the open state for the global command palette and the Cmd/Ctrl+K
 * shortcut that toggles it. Lives in the app shell (around the top bar) so any
 * route can open it. The search data is pre-fetched server-side and handed down.
 */
export function CommandPaletteProvider({
  children,
  items,
  collections,
}: {
  children: React.ReactNode;
  items: DashboardItem[];
  collections: SearchCollection[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ openPalette: () => setOpen(true) }}>
      {children}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        collections={collections}
      />
    </CommandPaletteContext.Provider>
  );
}
