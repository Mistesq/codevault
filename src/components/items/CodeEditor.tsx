"use client";

import { useState } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EditorCopyButton } from "@/components/items/editor-chrome";
import { useEditorPreferences } from "@/components/editor/editor-preferences-context";
import type { EditorTheme } from "@/lib/editor-preferences";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 400;

// Each selectable theme maps to a custom Monaco theme registered before mount,
// so the names never collide with Monaco's built-ins.
const THEME_NAMES: Record<EditorTheme, string> = {
  "vs-dark": "codevault-dark",
  monokai: "codevault-monokai",
  "github-dark": "codevault-github-dark",
};

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

// Shared themed scrollbar slider so every theme keeps the same subtle look.
const SCROLLBAR_COLORS = {
  "scrollbarSlider.background": "#ffffff1f",
  "scrollbarSlider.hoverBackground": "#ffffff33",
  "scrollbarSlider.activeBackground": "#ffffff4d",
};

/**
 * Registers the three selectable themes before the editor mounts. "vs-dark" is
 * the app's neutral palette; "monokai" and "github-dark" add token colors to
 * approximate their namesakes. Called once per editor.
 */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAMES["vs-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editorGutter.background": "#1e1e1e",
      "editor.lineHighlightBorder": "#00000000",
      ...SCROLLBAR_COLORS,
    },
  });

  monaco.editor.defineTheme(THEME_NAMES.monokai, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "keyword", foreground: "f92672" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "function", foreground: "a6e22e" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorGutter.background": "#272822",
      "editor.lineHighlightBorder": "#00000000",
      ...SCROLLBAR_COLORS,
    },
  });

  monaco.editor.defineTheme(THEME_NAMES["github-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "type", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorGutter.background": "#0d1117",
      "editor.lineHighlightBorder": "#00000000",
      ...SCROLLBAR_COLORS,
    },
  });
};

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
  headerTabs,
  headerActions,
  children,
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: string | null;
  readOnly?: boolean;
  className?: string;
  /** Slot rendered in the header's left cluster (e.g. Code/Explain tabs). */
  headerTabs?: React.ReactNode;
  /** Slot rendered in the header's right cluster, before Copy (e.g. Explain). */
  headerActions?: React.ReactNode;
  /** When provided, replaces the Monaco body (e.g. a streamed explanation). */
  children?: React.ReactNode;
}) {
  const [height, setHeight] = useState(MIN_HEIGHT);
  const { preferences } = useEditorPreferences();

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
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Decorative window dots — hidden when tabs occupy the same slot. */}
          {!headerTabs && (
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </div>
          )}
          {headerTabs}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {displayLanguage && (
            <span className="font-mono text-xs lowercase text-white/40">
              {displayLanguage}
            </span>
          )}
          {headerActions}
          <EditorCopyButton text={value} label="Copy code" />
        </div>
      </div>

      {children ? (
        children
      ) : (
        <div style={{ height }}>
          <Editor
          height="100%"
          theme={THEME_NAMES[preferences.theme]}
          language={toMonacoLanguage(language)}
          value={value}
          onChange={(next) => onChange?.(next ?? "")}
          beforeMount={defineThemes}
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
            minimap: { enabled: preferences.minimap },
            wordWrap: preferences.wordWrap ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: preferences.fontSize,
            lineHeight: 20,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
            fontLigatures: false,
            padding: { top: 12, bottom: 12 },
            tabSize: preferences.tabSize,
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
      )}
    </div>
  );
}
