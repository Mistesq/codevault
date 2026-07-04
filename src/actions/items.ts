"use server";

import { auth } from "@/auth";
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  setItemFavorite as setItemFavoriteQuery,
  setItemPinned as setItemPinnedQuery,
  updateItem as updateItemQuery,
} from "@/lib/db/items";
import type { ItemDetail } from "@/lib/db/items";
import { PLAN_LIMIT_MESSAGES, PlanLimitError } from "@/lib/billing/plan";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

// Coding standards' action pattern: { success, data, error }.
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new item from the New Item dialog. Requires a signed-in session,
 * validates the payload with Zod (source of truth), then delegates to the
 * session-user-scoped query. Returns the created ItemDetail.
 */
export async function createItem(
  input: unknown,
): Promise<ActionResult<ItemDetail>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  try {
    const created = await createItemQuery(parsed.data);
    if (!created) {
      return { success: false, error: "Could not create item." };
    }
    return { success: true, data: created };
  } catch (error) {
    // Free-tier cap / Pro-only surface → surface the upgrade CTA distinctly.
    if (error instanceof PlanLimitError) {
      return { success: false, error: PLAN_LIMIT_MESSAGES[error.resource] };
    }
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
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

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
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

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
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

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
