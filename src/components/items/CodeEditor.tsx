"use client";

import { useState } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Check, Copy } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 400;

/** Name of the custom theme registered before the editor mounts. */
const THEME_NAME = "codevault-dark";

// Map the free-text `language` we store on items to a Monaco language id.
// Unknown values fall through unchanged — Monaco just renders them as plaintext.
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  shell: "shell",
  py: "python",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
};

function toMonacoLanguage(language?: string | null): string {
  const normalized = (language ?? "").trim().toLowerCase();
  if (!normalized) return "plaintext";
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

/**
 * Registers a dark theme tuned to the app's neutral palette, with a subtle
 * themed scrollbar slider. Called once per editor before mount.
 */
const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editorGutter.background": "#1e1e1e",
      "editor.lineHighlightBorder": "#00000000",
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
    },
  });
};

/** Copies the editor's text and briefly flips the icon to a check. */
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
      aria-label="Copy code"
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
    >
      <Icon className={cn("size-3.5", copied && "text-emerald-400")} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Monaco-based code editor wrapped in a macOS-style window (traffic-light dots,
 * language label, and a quick copy button in the header). Used for code item
 * types (snippets & commands) in both editable and read-only (display) modes.
 *
 * Height is fluid: it grows with the content up to {@link MAX_HEIGHT}px, after
 * which Monaco's own (themed) scrollbar takes over.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: string | null;
  readOnly?: boolean;
  className?: string;
}) {
  const [height, setHeight] = useState(MIN_HEIGHT);

  function updateHeight(ed: editor.IStandaloneCodeEditor) {
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, ed.getContentHeight()));
    setHeight(next);
  }

  const handleMount: OnMount = (ed) => {
    // Re-measure whenever the content height changes so the wrapper grows/shrinks
    // with the code until it hits the max-height cap.
    ed.onDidContentSizeChange(() => updateHeight(ed));
    updateHeight(ed);
  };

  const displayLanguage = (language ?? "").trim();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-[#1e1e1e]",
        className,
      )}
    >
      {/* macOS-style window header: traffic-light dots + language + copy. */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          {displayLanguage && (
            <span className="font-mono text-xs lowercase text-white/40">
              {displayLanguage}
            </span>
          )}
          <CopyButton text={value} />
        </div>
      </div>

      <div style={{ height }}>
        <Editor
          height="100%"
          theme={THEME_NAME}
          language={toMonacoLanguage(language)}
          value={value}
          onChange={(next) => onChange?.(next ?? "")}
          beforeMount={defineTheme}
          onMount={handleMount}
          loading={
            <div className="w-full space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          }
          options={{
            readOnly,
            domReadOnly: readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 13,
            lineHeight: 20,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            fontLigatures: false,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            renderLineHighlight: readOnly ? "none" : "line",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              alwaysConsumeMouseWheel: false,
              useShadows: false,
            },
            contextmenu: !readOnly,
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
