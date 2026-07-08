import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Canonical error message for account-level mutations blocked on the shared
 * demo account (password/email changes, account deletion, settings). Kept in
 * one place so the wording — and every test asserting it — stays consistent.
 */
export const DEMO_ACCOUNT_ERROR =
  "This action is disabled on the demo account.";

/**
 * Whether `userId` is the shared demo account, read from the database record —
 * never from session claims or client input, so it cannot be spoofed. Actions
 * that already load the acting user should add `isDemo` to their existing
 * select instead of calling this (one query instead of two).
 */
export async function isDemoUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDemo: true },
  });
  return user?.isDemo ?? false;
}
