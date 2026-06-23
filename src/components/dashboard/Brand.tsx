import { Vault } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-hidden",
        collapsed && "justify-center",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Vault className="size-4" />
      </span>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="truncate text-sm font-semibold leading-tight">CodeVault</p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            Knowledge Hub
          </p>
        </div>
      )}
    </div>
  );
}
