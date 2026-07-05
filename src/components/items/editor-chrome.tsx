"use client";

import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/components/items/use-copy-to-clipboard";

/**
 * Shared header chrome for the dark editor windows (CodeEditor / MarkdownEditor)
 * and their AI overlays (CodeExplainer / PromptOptimizer): a pill tab button, a
 * ghost header button, and the "Copy" control — all keyed to the `#1e1e1e`
 * window's `white/*` palette.
 */

/**
 * A pill tab in an editor header. `size` matches the two existing paddings:
 * "sm" (`px-2 py-0.5`) for CodeEditor's header strip, "md" (`px-2.5 py-1`,
 * default) for MarkdownEditor's.
 */
export function TabButton({
  active,
  onClick,
  size = "md",
  children,
}: {
  active: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded text-xs font-medium transition-colors",
        size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1",
        active
          ? "bg-white/10 text-white/90"
          : "text-white/50 hover:bg-white/5 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}

/** A ghost header button matching the editor's Copy control. */
export function HeaderButton({
  onClick,
  disabled,
  title,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Copies the given text and briefly flips the icon/label to a check. */
export function EditorCopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const { copied, copy } = useCopyToClipboard(text);
  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
    >
      <Icon className={cn("size-3.5", copied && "text-emerald-400")} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
