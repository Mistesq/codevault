"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Crown, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { CodeEditor } from "@/components/items/CodeEditor";
import { HeaderButton, TabButton } from "@/components/items/editor-chrome";
import { explainCode } from "@/actions/ai";
import { cn } from "@/lib/utils";

type Tab = "code" | "explain";

// Client-safe copy for the Pro gate (the server action holds the authoritative
// `PLAN_LIMIT_MESSAGES.ai`, but that module is server-only).
const PRO_REQUIRED_MESSAGE = "AI features require a Pro subscription.";

// Lightweight per-session cache keyed by item id so re-opening the same item's
// drawer doesn't re-call Gemini (explanations aren't persisted server-side).
// Module-level: shared across drawer instances for the life of the tab.
const explanationCache = new Map<string, string>();

/**
 * Read-only code view (snippet/command) with an AI "Explain" affordance layered
 * onto {@link CodeEditor}'s window chrome. Pro users get a Sparkles button that
 * streams a markdown explanation into an Explain tab (progressive render, Loader2
 * only until the first token); Code/Explain tabs appear once an explanation
 * exists. Free users see a Crown button that toasts the upgrade prompt.
 *
 * The server action re-checks Pro + rate limits as the real enforcement; this
 * component only gates the UI.
 */
export function CodeExplainer({
  itemId,
  content,
  language,
  typeLabel,
  isPro,
}: {
  itemId: string;
  content: string;
  language?: string | null;
  typeLabel: string;
  isPro: boolean;
}) {
  const [tab, setTab] = useState<Tab>("code");
  const [explanation, setExplanation] = useState(
    () => explanationCache.get(itemId) ?? "",
  );
  const [loading, setLoading] = useState(false);

  const hasExplanation = explanation.length > 0;
  // The spinner shows only until the first token lands; after that the streamed
  // markdown carries the "in progress" signal.
  const showSpinner = loading && !hasExplanation;

  async function handleExplain() {
    if (!isPro) {
      toast.error(PRO_REQUIRED_MESSAGE);
      return;
    }
    if (loading) return;

    setLoading(true);
    setExplanation("");
    setTab("explain");

    const result = await explainCode({ content, language, type: typeLabel });
    if (!result.success) {
      setLoading(false);
      // Nothing streamed — fall back to the code view.
      if (!explanationCache.has(itemId)) setTab("code");
      setExplanation(explanationCache.get(itemId) ?? "");
      toast.error(result.error);
      return;
    }

    // Drain the stream token-by-token, appending to the live explanation.
    const reader = result.stream.getReader();
    let acc = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setExplanation(acc);
      }
    } catch {
      // Reader errored mid-stream — keep whatever arrived.
    }

    setLoading(false);
    if (acc) {
      explanationCache.set(itemId, acc);
    } else {
      // Empty stream — restore any prior explanation instead of blanking out.
      const cached = explanationCache.get(itemId) ?? "";
      setExplanation(cached);
      if (!cached) setTab("code");
      toast.error("Couldn't explain this code. Please try again.");
    }
  }

  const showTabs = hasExplanation || loading;

  const tabs = showTabs ? (
    <div className="flex items-center gap-1">
      <TabButton size="sm" active={tab === "code"} onClick={() => setTab("code")}>
        Code
      </TabButton>
      <TabButton
        size="sm"
        active={tab === "explain"}
        onClick={() => setTab("explain")}
      >
        Explain
      </TabButton>
    </div>
  ) : null;

  const actions = !isPro ? (
    <HeaderButton
      onClick={handleExplain}
      title="AI features require Pro subscription"
    >
      <Crown className="size-3.5 text-amber-400" />
      Explain
    </HeaderButton>
  ) : hasExplanation ? (
    <HeaderButton
      onClick={handleExplain}
      disabled={loading}
      title="Regenerate explanation"
      ariaLabel="Regenerate explanation"
    >
      <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
    </HeaderButton>
  ) : (
    <HeaderButton onClick={handleExplain} disabled={loading} title="Explain with AI">
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Sparkles className="size-3.5" />
      )}
      {loading ? "Explaining…" : "Explain"}
    </HeaderButton>
  );

  return (
    <CodeEditor
      value={content}
      language={language}
      readOnly
      headerTabs={tabs}
      headerActions={actions}
    >
      {tab === "explain" ? (
        <div
          className="markdown-scroll overflow-y-auto p-3"
          style={{ minHeight: 100, maxHeight: 400 }}
        >
          {showSpinner ? (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" />
              Explaining…
            </div>
          ) : hasExplanation ? (
            <div className="markdown-preview">
              <Markdown remarkPlugins={[remarkGfm]}>{explanation}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-white/30">No explanation yet.</p>
          )}
        </div>
      ) : undefined}
    </CodeEditor>
  );
}
