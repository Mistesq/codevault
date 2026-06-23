"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "codevault:sidebar-collapsed";

// Tiny external store so the collapsed preference can persist to localStorage
// without a setState-in-effect (which the React Compiler lint rules forbid).
// useSyncExternalStore renders the server snapshot first, then re-reads on the
// client after hydration — so there's no hydration mismatch either.
let collapsedValue = false;
let initialized = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    collapsedValue = window.localStorage.getItem(STORAGE_KEY) === "true";
  }
  return collapsedValue;
}

function getServerSnapshot() {
  return false;
}

function setCollapsed(next: boolean) {
  collapsedValue = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }
  listeners.forEach((listener) => listener());
}

interface SidebarContextValue {
  // Desktop: sidebar collapsed to a narrow icon rail.
  collapsed: boolean;
  toggleCollapsed: () => void;
  // Mobile: sidebar shown as an overlay drawer.
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
