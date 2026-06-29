"use server";

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { createCollection as createCollectionQuery } from "@/lib/db/collections";
import type { DashboardCollection } from "@/lib/db/collections";
import { createCollectionSchema } from "@/lib/validations/collections";

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
