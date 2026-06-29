"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { editorPreferencesSchema } from "@/lib/validations/editor-preferences";
import type { EditorPreferences } from "@/lib/editor-preferences";

// Result shape shared with the other account mutations (coding standards' action
// pattern). On success we return the saved preferences so the client can keep
// its optimistic state in sync with what was actually persisted.
type ActionResult =
  | { success: true; data: EditorPreferences }
  | { success: false; error: string };

/**
 * Persist the signed-in user's Monaco editor preferences to the JSON column.
 * Always scoped to the caller's own account (the session's userId). Validates
 * against the same option lists the UI offers, so an out-of-range value can't be
 * stored.
 */
export async function updateEditorPreferences(
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = editorPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid preferences.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { editorPreferences: parsed.data },
    });

    return { success: true, data: parsed.data };
  } catch (error) {
    console.error("Update editor preferences failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
