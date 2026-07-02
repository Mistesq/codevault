import Link from "next/link";

import { cn } from "@/lib/utils";

export interface TabNavItem {
  /** Visible tab label, e.g. "Items". */
  label: string;
  /** Destination href (tabs navigate; state lives in the URL). */
  href: string;
  /** Optional count rendered as a muted number after the label. */
  count?: number;
  active: boolean;
}

/**
 * Underline-style tab bar rendered as navigation links. State lives in the URL
 * (each tab is a `<Link>`), so the surrounding page stays server-rendered and
 * consistent with the link-based sort + pagination. The active tab gets an
 * accent underline; each label can carry a count.
 */
export function TabNav({ items }: { items: TabNavItem[] }) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-4 border-b border-border"
    >
      {items.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
            tab.active
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "text-xs",
                tab.active ? "text-muted-foreground" : "text-muted-foreground/70",
              )}
            >
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
