"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { NOT_SIGNED_IN_ERROR, requireSessionUser } from "@/lib/actions/session";
import { parseActionInput } from "@/lib/actions/result";
import { changePasswordSchema } from "@/lib/validations/auth";

// The profile mutations return no data, so they keep a local no-data result
// shape rather than the generic ActionResult<T> used by the other actions.
type ActionResult = { success: true } | { success: false; error: string };

/**
 * Change the signed-in user's password. Requires the current password, verifies
 * it with bcrypt, then stores a fresh cost-12 hash. Only works for accounts that
 * already have a password (email/password users) — OAuth-only accounts have none.
 */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };
  const userId = user.id;

  const parsed = parseActionInput(changePasswordSchema, input);
  if (!parsed.success) return parsed;

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      return {
        success: false,
        error: "Password changes aren't available for this account.",
      };
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return { success: false, error: "Current password is incorrect." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Change password failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Permanently delete the signed-in user's account and all cascaded data, then
 * sign them out. Requires the literal "DELETE" confirmation as a guard against
 * accidental deletion. Always scoped to the caller's own account (the session's
 * userId), so it can never delete anyone else.
 */
export async function deleteAccount(confirmation: unknown): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };
  const userId = user.id;

  if (confirmation !== "DELETE") {
    return { success: false, error: 'Type "DELETE" to confirm.' };
  }

  try {
    // Cascade deletes (schema onDelete: Cascade) clean up items/collections/
    // tags/accounts/sessions.
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error("Delete account failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // Clears the session cookie and redirects. Called outside the try/catch
  // because signOut throws a redirect "error" by design.
  await signOut({ redirectTo: "/sign-in" });
  return { success: true };
}
