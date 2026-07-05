import "server-only";
import { prisma } from "@/lib/prisma";
import { consumeSingleUseToken, createSingleUseToken } from "@/lib/auth/token";

// Email-verification token helpers backed by the Auth.js `VerificationToken`
// model (identifier = email). Tokens are single-use and expire after 24 hours.
// The hashing / generation / single-use lifecycle lives in `./token`.

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Create a fresh verification token for an email, invalidating any prior tokens
 * for that address. Returns the raw token to embed in the verification link.
 */
export async function createVerificationToken(email: string): Promise<string> {
  return createSingleUseToken(email, TOKEN_TTL_MS);
}

export type ConsumeResult = "success" | "expired" | "invalid";

/**
 * Validate a raw token from a verification link. On success, marks the matching
 * user's email as verified. The token is always deleted (single use), whether it
 * was valid, expired, or already consumed.
 */
export async function consumeVerificationToken(
  rawToken: string,
): Promise<ConsumeResult> {
  // Only match genuine email-verification tokens. Password-reset tokens live in
  // the same table but namespace their identifier as `password-reset:{email}`;
  // excluding them here keeps a reset token from being consumed (and the email
  // wrongly marked verified) via the verify-email path. Mirrors the prefix guard
  // in consumePasswordResetToken.
  const outcome = await consumeSingleUseToken(rawToken, {
    not: { startsWith: "password-reset:" },
  });

  if (outcome.status === "invalid") return "invalid";
  if (outcome.status === "expired") return "expired";

  // updateMany (not update) so a deleted account doesn't throw.
  await prisma.user.updateMany({
    where: { email: outcome.record.identifier },
    data: { emailVerified: new Date() },
  });

  return "success";
}
