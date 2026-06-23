import type { ComponentType } from "react";
import { Boxes, FolderClosed, FolderHeart, Star } from "lucide-react";

import { getStats } from "@/lib/dashboard-data";

type IconComponent = ComponentType<{ className?: string }>;

interface Stat {
  label: string;
  value: number;
  icon: IconComponent;
}

export function StatsCards() {
  const stats = getStats();

  const cards: Stat[] = [
    { label: "Items", value: stats.totalItems, icon: Boxes },
    { label: "Collections", value: stats.totalCollections, icon: FolderClosed },
    { label: "Favorite Items", value: stats.favoriteItems, icon: Star },
    {
      label: "Favorite Collections",
      value: stats.favoriteCollections,
      icon: FolderHeart,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </span>
          <div className="overflow-hidden">
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
