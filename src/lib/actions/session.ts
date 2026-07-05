import "server-only";

import type { Session } from "next-auth";
import { auth } from "@/auth";

/** The authenticated user carried on the NextAuth session (id, isPro, …). */
export type SessionUser = NonNullable<Session["user"]>;

/**
 * Canonical "not signed in" error message for the action result pattern. Kept in
 * one place so the wording (and every test asserting it) stays consistent.
 */
export const NOT_SIGNED_IN_ERROR = "You must be signed in.";

/**
 * Resolve the signed-in user from the NextAuth session, or `null` when there is
 * no session. Shared by every mutation action so the auth guard is a two-liner:
 *
 * ```ts
 * const user = await requireSessionUser();
 * if (!user) return { success: false, error: NOT_SIGNED_IN_ERROR };
 * ```
 */
export async function requireSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}
