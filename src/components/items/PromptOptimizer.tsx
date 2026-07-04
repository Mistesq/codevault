"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, Crown, Loader2, RefreshCw, Sparkles, X } from "lucide-react";

import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { optimizePrompt } from "@/actions/ai";
import { updateItem } from "@/actions/items";
import { buildItemFields } from "@/lib/item-form";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/lib/db/items";

type Tab = "original" | "optimized";

// Client-safe copy for the Pro gate (the server action holds the authoritative
// `PLAN_LIMIT_MESSAGES.ai`, but that module is server-only).
const PRO_REQUIRED_MESSAGE = "AI features require a Pro subscription.";

// Lightweight per-session cache keyed by item id so re-opening the same prompt's
// drawer keeps a pending optimization (results aren't persisted until accepted).
// Module-level: shared across drawer instances for the life of the tab.
const optimizedCache = new Map<string, string>();

/**
 * Read-only prompt view with an AI "Optimize" affordance layered onto
 * {@link MarkdownEditor}'s window chrome — the prompt equivalent of
 * {@link CodeExplainer}. Pro users get a Sparkles button that asks Gemini to
 * refine the prompt; the result lands in an Optimized tab with an Accept/Discard
 * bar. Accepting persists it via {@link updateItem} (and refreshes the drawer +
 * card); discarding keeps the original. Free users see a Crown button that toasts
 * the upgrade prompt.
 *
 * The server action re-checks Pro + rate limits as the real enforcement; this
 * component only gates the UI.
 */
export function PromptOptimizer({
  detail,
  isPro,
  onUpdated,
}: {
  detail: ItemDetail;
  isPro: boolean;
  onUpdated: (detail: ItemDetail) => void;
}) {
  const router = useRouter();
  const content = detail.content ?? "";

  const [tab, setTab] = useState<Tab>("original");
  const [optimized, setOptimized] = useState(
    () => optimizedCache.get(detail.id) ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasOptimized = optimized.length > 0;
  // The spinner shows only while the request is in flight with nothing to show.
  const showSpinner = loading && !hasOptimized;

  async function handleOptimize() {
    if (!isPro) {
      toast.error(PRO_REQUIRED_MESSAGE);
      return;
    }
    if (loading) return;

    setLoading(true);
    setTab("optimized");

    const result = await optimizePrompt({ content });
    setLoading(false);

    if (!result.success) {
      // Nothing new — fall back to the original view unless a prior result exists.
      if (!optimizedCache.has(detail.id)) setTab("original");
      toast.error(result.error);
      return;
    }

    setOptimized(result.data);
    optimizedCache.set(detail.id, result.data);
    setTab("optimized");
  }

  async function handleAccept() {
    if (saving || !hasOptimized) return;
    setSaving(true);

    // A prompt only shows the content field — language/url are hidden (nulled).
    const payload = buildItemFields({
      title: detail.title,
      description: detail.description ?? "",
      content: optimized,
      language: "",
      url: "",
      tags: detail.tags.join(", "),
      showContent: true,
      showLanguage: false,
      showUrl: false,
    });

    const result = await updateItem(detail.id, {
      ...payload,
      collectionIds: detail.collections.map((c) => c.id),
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    optimizedCache.delete(detail.id);
    setOptimized("");
    setTab("original");
    toast.success("Prompt updated.");
    router.refresh();
    onUpdated(result.data);
  }

  function handleDiscard() {
    optimizedCache.delete(detail.id);
    setOptimized("");
    setTab("original");
  }

  const showTabs = hasOptimized || loading;

  const tabs = showTabs ? (
    <div className="flex items-center gap-1">
      <TabButton active={tab === "original"} onClick={() => setTab("original")}>
        Original
      </TabButton>
      <TabButton
        active={tab === "optimized"}
        onClick={() => setTab("optimized")}
      >
        Optimized
      </TabButton>
    </div>
  ) : null;

  const actions = !isPro ? (
    <HeaderButton
      onClick={handleOptimize}
      title="AI features require Pro subscription"
    >
      <Crown className="size-3.5 text-amber-400" />
      Optimize
    </HeaderButton>
  ) : hasOptimized ? (
    <HeaderButton
      onClick={handleOptimize}
      disabled={loading}
      title="Regenerate optimized prompt"
      ariaLabel="Regenerate optimized prompt"
    >
      <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
    </HeaderButton>
  ) : (
    <HeaderButton
      onClick={handleOptimize}
      disabled={loading}
      title="Optimize with AI"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Sparkles className="size-3.5" />
      )}
      {loading ? "Optimizing…" : "Optimize"}
    </HeaderButton>
  );

  return (
    <MarkdownEditor
      value={content}
      readOnly
      headerTabs={tabs}
      headerActions={actions}
    >
      {tab === "optimized" ? (
        <div>
          <div
            className="markdown-scroll overflow-y-auto p-3"
            style={{ minHeight: 150, maxHeight: 400 }}
          >
            {showSpinner ? (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="size-4 animate-spin" />
                Optimizing…
              </div>
            ) : hasOptimized ? (
              <div className="markdown-preview">
                <Markdown remarkPlugins={[remarkGfm]}>{optimized}</Markdown>
              </div>
            ) : (
              <p className="text-sm text-white/30">No optimized prompt yet.</p>
            )}
          </div>

          {hasOptimized && (
            <div className="flex items-center gap-2 border-t border-white/10 bg-[#2d2d2d] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-white/50">
                Use this optimized prompt?
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <FooterButton
                  onClick={handleDiscard}
                  disabled={saving}
                  title="Keep the original prompt"
                >
                  <X className="size-3.5" />
                  Discard
                </FooterButton>
                <FooterButton
                  onClick={handleAccept}
                  disabled={saving}
                  title="Replace the prompt with this version"
                  variant="accept"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {saving ? "Saving…" : "Use this"}
                </FooterButton>
              </div>
            </div>
          )}
        </div>
      ) : undefined}
    </MarkdownEditor>
  );
}

/** A pill tab in the editor header, matching MarkdownEditor's tab styling. */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-white/10 text-white/90"
          : "text-white/50 hover:bg-white/5 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}

/** A ghost header button matching MarkdownEditor's Copy control. */
function HeaderButton({
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

/** Accept/Discard control in the optimized-view footer bar. */
function FooterButton({
  onClick,
  disabled,
  title,
  variant = "default",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  variant?: "default" | "accept";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex cursor-pointer items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "accept"
          ? "bg-emerald-500/90 text-white hover:bg-emerald-500"
          : "text-white/60 hover:bg-white/10 hover:text-white/90",
      )}
    >
      {children}
    </button>
  );
}
