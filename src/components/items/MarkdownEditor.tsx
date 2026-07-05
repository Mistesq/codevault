"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { EditorCopyButton, TabButton } from "@/components/items/editor-chrome";

const MIN_HEIGHT = 150;
const MAX_HEIGHT = 400;

type Tab = "write" | "preview";

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
  headerTabs,
  headerActions,
  children,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  /** Slot rendered in the header's left cluster, replacing the default tabs. */
  headerTabs?: React.ReactNode;
  /** Slot rendered in the header's right cluster, before Copy (e.g. Optimize). */
  headerActions?: React.ReactNode;
  /** When provided, replaces the editor body (e.g. an optimized-prompt view). */
  children?: React.ReactNode;
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
      {/* Header: Write/Preview tabs + copy, on the #2d2d2d strip. When headerTabs
          is supplied it replaces the default tabs (e.g. Original/Optimized). */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-2 py-1.5">
        <div className="flex items-center gap-1">
          {headerTabs ?? (
            <>
              {!readOnly && (
                <TabButton active={tab === "write"} onClick={() => setTab("write")}>
                  Write
                </TabButton>
              )}
              <TabButton
                active={tab === "preview"}
                onClick={() => setTab("preview")}
              >
                Preview
              </TabButton>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <EditorCopyButton text={value} label="Copy markdown" />
        </div>
      </div>

      {children ? (
        children
      ) : tab === "write" && !readOnly ? (
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
