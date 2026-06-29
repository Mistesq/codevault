"use client";

import { createContext, useContext, useState } from "react";

import {
  DEFAULT_EDITOR_PREFERENCES,
  type EditorPreferences,
} from "@/lib/editor-preferences";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  /** Replace the current preferences (used for optimistic settings updates). */
  setPreferences: (preferences: EditorPreferences) => void;
}

const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

/**
 * Reads the current editor preferences. Falls back to the defaults when used
 * outside a provider so the CodeEditor stays usable in any render tree (e.g.
 * isolated previews) — the provider lives in the app shell for signed-in routes.
 */
export function useEditorPreferences(): EditorPreferencesContextValue {
  const ctx = useContext(EditorPreferencesContext);
  if (!ctx) {
    return {
      preferences: DEFAULT_EDITOR_PREFERENCES,
      setPreferences: () => {},
    };
  }
  return ctx;
}

/**
 * Holds the signed-in user's editor preferences for client components. Seeded
 * with the server-loaded preferences; the settings form updates them optimistically
 * via `setPreferences` so every open editor reflects a change immediately.
 */
export function EditorPreferencesProvider({
  initial,
  children,
}: {
  initial: EditorPreferences;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<EditorPreferences>(initial);

  return (
    <EditorPreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </EditorPreferencesContext.Provider>
  );
}
