import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Email-verification token helpers backed by the Auth.js `VerificationToken`
// model (identifier = email). The raw token is only ever sent in the email link;
// the database stores a SHA-256 hash so a DB leak can't be used to verify
// accounts. Tokens are single-use and expire after 24 hours.

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Create a fresh verification token for an email, invalidating any prior tokens
 * for that address. Returns the raw token to embed in the verification link.
 */
export async function createVerificationToken(email: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const token = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  // One pending token per address: drop older ones so old links stop working.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  return rawToken;
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
  const token = hashToken(rawToken);

  // Only match genuine email-verification tokens. Password-reset tokens live in
  // the same table but namespace their identifier as `password-reset:{email}`;
  // excluding them here keeps a reset token from being consumed (and the email
  // wrongly marked verified) via the verify-email path. Mirrors the prefix guard
  // in consumePasswordResetToken.
  const record = await prisma.verificationToken.findFirst({
    where: { token, identifier: { not: { startsWith: "password-reset:" } } },
  });
  if (!record) return "invalid";

  // Single use: remove it regardless of the outcome below.
  await prisma.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) return "expired";

  // updateMany (not update) so a deleted account doesn't throw.
  await prisma.user.updateMany({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });

  return "success";
}
