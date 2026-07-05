"use server";

import { prisma } from "@/lib/prisma";
import { NOT_SIGNED_IN_ERROR, requireSessionUser } from "@/lib/actions/session";
import { type ActionResult, parseActionInput } from "@/lib/actions/result";
import { editorPreferencesSchema } from "@/lib/validations/editor-preferences";
import type { EditorPreferences } from "@/lib/editor-preferences";

/**
 * Persist the signed-in user's Monaco editor preferences to the JSON column.
 * Always scoped to the caller's own account (the session's userId). Validates
 * against the same option lists the UI offers, so an out-of-range value can't be
 * stored.
 */
export async function updateEditorPreferences(
  input: unknown,
): Promise<ActionResult<EditorPreferences>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };
  const userId = user.id;

  const parsed = parseActionInput(
    editorPreferencesSchema,
    input,
    "Invalid preferences.",
  );
  if (!parsed.success) return parsed;

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
