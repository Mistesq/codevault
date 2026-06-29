import { z } from "zod";

import {
  EDITOR_THEMES,
  FONT_SIZE_OPTIONS,
  TAB_SIZE_OPTIONS,
} from "@/lib/editor-preferences";

// Editor-preferences payload validated by the updateEditorPreferences action
// before it's written to User.editorPreferences. Numeric/theme fields are
// constrained to the same option lists the UI offers so we never persist a value
// the editor or dropdowns can't represent.

export const editorPreferencesSchema = z.object({
  fontSize: z
    .number()
    .refine((v) => (FONT_SIZE_OPTIONS as readonly number[]).includes(v), {
      message: "Invalid font size.",
    }),
  tabSize: z
    .number()
    .refine((v) => (TAB_SIZE_OPTIONS as readonly number[]).includes(v), {
      message: "Invalid tab size.",
    }),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES),
});

export type EditorPreferencesInput = z.infer<typeof editorPreferencesSchema>;
