"use server";

import { NOT_SIGNED_IN_ERROR, requireSessionUser } from "@/lib/actions/session";
import { type ActionResult, parseActionInput } from "@/lib/actions/result";
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  setItemFavorite as setItemFavoriteQuery,
  setItemPinned as setItemPinnedQuery,
  updateItem as updateItemQuery,
} from "@/lib/db/items";
import type { ItemDetail } from "@/lib/db/items";
import { planLimitMessage } from "@/lib/billing/plan";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

/**
 * Create a new item from the New Item dialog. Requires a signed-in session,
 * validates the payload with Zod (source of truth), then delegates to the
 * session-user-scoped query. Returns the created ItemDetail.
 */
export async function createItem(
  input: unknown,
): Promise<ActionResult<ItemDetail>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  const parsed = parseActionInput(createItemSchema, input);
  if (!parsed.success) return parsed;

  try {
    const created = await createItemQuery(parsed.data);
    if (!created) {
      return { success: false, error: "Could not create item." };
    }
    return { success: true, data: created };
  } catch (error) {
    // Free-tier cap / Pro-only surface → surface the upgrade CTA distinctly.
    const upgradeMessage = planLimitMessage(error);
    if (upgradeMessage) return { success: false, error: upgradeMessage };
    console.error("Create item failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Update an item from the drawer's edit mode. Requires a signed-in session,
 * validates the payload with Zod (source of truth), then delegates to the
 * session-user-scoped query (which also enforces ownership). Returns the
 * refreshed ItemDetail so the drawer can update without a second fetch.
 */
export async function updateItem(
  itemId: string,
  input: unknown,
): Promise<ActionResult<ItemDetail>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  const parsed = parseActionInput(updateItemSchema, input);
  if (!parsed.success) return parsed;

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

/**
 * Toggle an item's favorite flag from a card / the drawer. Requires a signed-in
 * session, then delegates to the ownership-scoped query (which reports not-found
 * for a missing / foreign id). Takes the desired new state so the operation is
 * idempotent. Returns the applied state in `data`.
 */
export async function setItemFavorite(
  itemId: string,
  isFavorite: boolean,
): Promise<ActionResult<boolean>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  if (typeof isFavorite !== "boolean") {
    return { success: false, error: "Invalid request." };
  }

  try {
    const updated = await setItemFavoriteQuery(itemId, isFavorite);
    if (!updated) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: isFavorite };
  } catch (error) {
    console.error("Toggle item favorite failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Toggle an item's pinned flag from the drawer. Requires a signed-in session,
 * then delegates to the ownership-scoped query (which reports not-found for a
 * missing / foreign id). Takes the desired new state so the operation is
 * idempotent. Returns the applied state in `data`.
 */
export async function setItemPinned(
  itemId: string,
  isPinned: boolean,
): Promise<ActionResult<boolean>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  if (typeof isPinned !== "boolean") {
    return { success: false, error: "Invalid request." };
  }

  try {
    const updated = await setItemPinnedQuery(itemId, isPinned);
    if (!updated) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: isPinned };
  } catch (error) {
    console.error("Toggle item pin failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Permanently delete an item from the drawer. Requires a signed-in session,
 * then delegates to the session-user-scoped query (which enforces ownership and
 * reports not-found). Returns the `{ success, error }` pattern.
 */
export async function deleteItem(
  itemId: string,
): Promise<ActionResult<null>> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };

  try {
    const deleted = await deleteItemQuery(itemId);
    if (!deleted) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error("Delete item failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
