"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

const MIN_HEIGHT = 150;
const MAX_HEIGHT = 400;

type Tab = "write" | "preview";

/** Copies the given text and briefly flips the icon to a check. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can reject (e.g. insecure context); silently ignore.
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy markdown"
      className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
    >
      <Icon className={cn("size-3.5", copied && "text-emerald-400")} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

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

/**
 * Markdown editor with Write/Preview tabs, styled to match {@link CodeEditor}'s
 * dark window (`#1e1e1e` body, `#2d2d2d` header, header copy button). Used for
 * text item types that aren't code (notes & prompts) in both editable and
 * read-only (display) modes.
 *
 * - Edit mode defaults to the Write tab, with Preview available.
 * - Read-only mode shows only the Preview tab.
 *
 * Height is fluid up to {@link MAX_HEIGHT}px, after which the body scrolls —
 * mirroring CodeEditor's behavior.
 */
export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>(readOnly ? "preview" : "write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content up to MAX_HEIGHT, then let it scroll.
  // Runs on value/tab changes; this only mutates DOM style, not state.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || tab !== "write") return;
    el.style.height = "auto";
    el.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight))}px`;
  }, [value, tab]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-[#1e1e1e]",
        className,
      )}
    >
      {/* Header: Write/Preview tabs + copy, on the #2d2d2d strip. */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-2 py-1.5">
        <div className="flex items-center gap-1">
          {!readOnly && (
            <TabButton active={tab === "write"} onClick={() => setTab("write")}>
              Write
            </TabButton>
          )}
          <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
            Preview
          </TabButton>
        </div>
        <CopyButton text={value} />
      </div>

      {tab === "write" && !readOnly ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Write Markdown…"
          spellCheck={false}
          className="markdown-scroll block w-full resize-none border-0 bg-transparent p-3 font-mono text-sm text-white/90 outline-none placeholder:text-white/30"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        />
      ) : (
        <div
          className="markdown-scroll overflow-y-auto p-3"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        >
          {value.trim() ? (
            <div className="markdown-preview">
              <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-white/30">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
