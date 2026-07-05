import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Rendered inside the muted icon badge (a lucide icon or <TypeIcon />). */
  icon: ReactNode;
  /** Overrides the badge's default `text-muted-foreground` (e.g. "text-sky-400"). */
  iconClassName?: string;
  /** Inline color for the badge (used when the color is data-driven, not a class). */
  iconColor?: string;
  title: string;
  /** Rendered inline after the title, e.g. a favorite star. */
  titleTrailing?: ReactNode;
  /** Optional larger line under the title (e.g. a collection description). */
  description?: string;
  /** Small muted line under the title — a count or helper text. */
  subtitle?: ReactNode;
  /** Right-aligned actions (buttons, menus). */
  actions?: ReactNode;
  /** "start" aligns to the top and lets the title truncate (for long, dynamic titles). */
  align?: "center" | "start";
};

/**
 * Shared list/detail page header: a muted icon badge, a title (with optional
 * trailing element and description), a subtitle, and optional right-aligned
 * actions. Single-sources the badge markup repeated across the list pages.
 */
export function PageHeader({
  icon,
  iconClassName,
  iconColor,
  title,
  titleTrailing,
  description,
  subtitle,
  actions,
  align = "center",
}: PageHeaderProps) {
  const isStart = align === "start";
  const titleEl = (
    <h1 className={cn("text-lg font-semibold", isStart && "truncate")}>
      {title}
    </h1>
  );

  return (
    <header className={cn("flex gap-3", isStart ? "items-start" : "items-center")}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted",
          iconClassName ?? "text-muted-foreground",
        )}
        style={iconColor ? { color: iconColor } : undefined}
      >
        {icon}
      </span>
      <div className={isStart ? "min-w-0 flex-1" : undefined}>
        {titleTrailing ? (
          <div className="flex items-center gap-2">
            {titleEl}
            {titleTrailing}
          </div>
        ) : (
          titleEl
        )}
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
        {subtitle != null && (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              // In the roomier start-aligned detail header (or when a description
              // sits above it) the subtitle gets a small top gap; the compact
              // center header keeps it tight under the title.
              (isStart || description) && "mt-0.5",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions != null && <div className="ml-auto">{actions}</div>}
    </header>
  );
}
