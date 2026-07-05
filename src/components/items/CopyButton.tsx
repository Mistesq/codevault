"use client";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/components/items/use-copy-to-clipboard";

/** Small button that copies text and briefly flips to a check. */
export function CopyButton({
  text,
  variant = "ghost",
  size = "icon-sm",
  label = "Copy",
  withLabel = false,
  className,
}: {
  text: string;
  variant?: "ghost" | "outline" | "default";
  size?: "icon-sm" | "sm" | "default";
  label?: string;
  withLabel?: boolean;
  className?: string;
}) {
  const { copied, copy } = useCopyToClipboard(text);
  const Icon = copied ? Check : Copy;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      aria-label={label}
      className={className}
    >
      <Icon className={cn("size-4", copied && "text-emerald-500")} />
      {withLabel && <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}
