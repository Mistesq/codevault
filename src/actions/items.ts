"use server";

import { auth } from "@/auth";
import { updateItem as updateItemQuery } from "@/lib/db/items";
import type { ItemDetail } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/validations/items";

// Coding standards' action pattern: { success, data, error }.
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Update an item from the drawer's edit mode. Requires a signed-in session,
 * validates the payload with Zod (source of truth), then delegates to the
 * demo-user-scoped query (which also enforces ownership). Returns the refreshed
 * ItemDetail so the drawer can update without a second fetch.
 */
export async function updateItem(
  itemId: string,
  input: unknown,
): Promise<ActionResult<ItemDetail>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  try {
    const updated = await updateItemQuery(itemId, parsed.data);
    if (!updated) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: updated };
  } catch (error) {
    console.error("Update item failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
