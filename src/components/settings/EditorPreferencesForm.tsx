"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEditorPreferences } from "@/components/editor/editor-preferences-context";
import { updateEditorPreferences } from "@/actions/editor-preferences";
import {
  EDITOR_THEME_LABELS,
  EDITOR_THEMES,
  FONT_SIZE_OPTIONS,
  TAB_SIZE_OPTIONS,
  type EditorPreferences,
} from "@/lib/editor-preferences";

/** One labelled settings row: text on the left, control on the right. */
function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** A compact dark-themed native select used for the editor dropdowns. */
function SelectControl({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-36 cursor-pointer rounded-md border border-border bg-background px-3 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {children}
    </select>
  );
}

/**
 * Editor preferences with no save button: every control auto-saves on change.
 * State is read from the EditorPreferencesContext so changes apply to open Monaco
 * editors immediately; the update is optimistic and rolled back if the server
 * action fails.
 */
export function EditorPreferencesForm() {
  const { preferences, setPreferences } = useEditorPreferences();
  const [, startTransition] = useTransition();

  function save(next: EditorPreferences) {
    const previous = preferences;
    // Optimistic: update every open editor right away.
    setPreferences(next);

    startTransition(async () => {
      const result = await updateEditorPreferences(next);
      if (result.success) {
        toast.success("Editor preferences saved.");
      } else {
        setPreferences(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold">Editor Preferences</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Customize the code editor. Changes are saved automatically.
      </p>

      <div className="mt-4 divide-y divide-border border-t border-border">
        <SettingRow
          label="Font size"
          description="Editor font size in pixels."
          htmlFor="editor-font-size"
        >
          <SelectControl
            id="editor-font-size"
            value={String(preferences.fontSize)}
            onChange={(v) => save({ ...preferences, fontSize: Number(v) })}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </SelectControl>
        </SettingRow>

        <SettingRow
          label="Tab size"
          description="Number of spaces per indentation level."
          htmlFor="editor-tab-size"
        >
          <SelectControl
            id="editor-tab-size"
            value={String(preferences.tabSize)}
            onChange={(v) => save({ ...preferences, tabSize: Number(v) })}
          >
            {TAB_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} spaces
              </option>
            ))}
          </SelectControl>
        </SettingRow>

        <SettingRow
          label="Theme"
          description="Color theme for the code editor."
          htmlFor="editor-theme"
        >
          <SelectControl
            id="editor-theme"
            value={preferences.theme}
            onChange={(v) =>
              save({
                ...preferences,
                theme: v as EditorPreferences["theme"],
              })
            }
          >
            {EDITOR_THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {EDITOR_THEME_LABELS[theme]}
              </option>
            ))}
          </SelectControl>
        </SettingRow>

        <SettingRow
          label="Word wrap"
          description="Wrap long lines instead of scrolling horizontally."
        >
          <Switch
            checked={preferences.wordWrap}
            onCheckedChange={(checked) =>
              save({ ...preferences, wordWrap: checked })
            }
          />
        </SettingRow>

        <SettingRow
          label="Minimap"
          description="Show the code overview minimap on the right."
        >
          <Switch
            checked={preferences.minimap}
            onCheckedChange={(checked) =>
              save({ ...preferences, minimap: checked })
            }
          />
        </SettingRow>
      </div>
    </section>
  );
}
