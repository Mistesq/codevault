"use server";

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  setCollectionFavorite as setCollectionFavoriteQuery,
} from "@/lib/db/collections";
import type { DashboardCollection } from "@/lib/db/collections";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/lib/validations/collections";

// Coding standards' action pattern: { success, data, error }.
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new collection from the New Collection dialog. Requires a signed-in
 * session, validates the payload with Zod (source of truth), then delegates to
 * the demo-user-scoped query. A duplicate name (the `@@unique([userId, name])`
 * constraint → Prisma P2002) surfaces as a friendly message rather than a raw
 * exception. Returns the created collection.
 */
export async function createCollection(
  input: unknown,
): Promise<ActionResult<DashboardCollection>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  try {
    const created = await createCollectionQuery(parsed.data);
    if (!created) {
      return { success: false, error: "Could not create collection." };
    }
    return { success: true, data: created };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A collection with that name already exists.",
      };
    }
    console.error("Create collection failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Update a collection's metadata (name + description) from the Edit dialog.
 * Requires a session, validates with Zod, then delegates to the ownership-scoped
 * query. A duplicate name (P2002) surfaces as a friendly message; a missing /
 * non-owned id comes back as a not-found error.
 */
export async function updateCollection(
  id: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details.",
    };
  }

  try {
    const updated = await updateCollectionQuery(id, parsed.data);
    if (!updated) {
      return { success: false, error: "Collection not found." };
    }
    return { success: true, data: null };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "A collection with that name already exists.",
      };
    }
    console.error("Update collection failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Toggle a collection's favorite flag from a card / the detail header. Requires
 * a session, then delegates to the ownership-scoped query (which reports
 * not-found for a missing / foreign id). Takes the desired new state so the
 * operation is idempotent. Returns the applied state in `data`.
 */
export async function setCollectionFavorite(
  id: string,
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
    const updated = await setCollectionFavoriteQuery(id, isFavorite);
    if (!updated) {
      return { success: false, error: "Collection not found." };
    }
    return { success: true, data: isFavorite };
  } catch (error) {
    console.error("Toggle collection favorite failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Delete a collection from the confirmation dialog. Requires a session, then
 * delegates to the ownership-scoped query — only the collection and its
 * membership rows are removed, the items themselves are kept.
 */
export async function deleteCollection(
  id: string,
): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    const deleted = await deleteCollectionQuery(id);
    if (!deleted) {
      return { success: false, error: "Collection not found." };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error("Delete collection failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
