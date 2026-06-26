import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Password-reset token helpers backed by the Auth.js `VerificationToken` model.
// To avoid clobbering email-verification tokens (which use `identifier = email`),
// reset tokens namespace the identifier as `password-reset:{email}`. The raw
// token is only ever sent in the email link; the database stores a SHA-256 hash
// so a DB leak can't be used to reset accounts. Tokens are single-use and expire
// after 1 hour.

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
const IDENTIFIER_PREFIX = "password-reset:";

function identifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Create a fresh password-reset token for an email, invalidating any prior reset
 * tokens for that address. Returns the raw token to embed in the reset link.
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const token = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const identifier = identifierFor(email);

  // One pending reset token per address: drop older ones so old links stop working.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return rawToken;
}

export type ConsumeResetResult =
  | { status: "success"; email: string }
  | { status: "expired" | "invalid"; email: null };

/**
 * Validate a raw reset token from a link. The token is always deleted (single
 * use), whether it was valid, expired, or already consumed. On success, returns
 * the target email so the caller can update that user's password.
 */
export async function consumePasswordResetToken(
  rawToken: string,
): Promise<ConsumeResetResult> {
  const token = hashToken(rawToken);

  const record = await prisma.verificationToken.findFirst({
    where: { token, identifier: { startsWith: IDENTIFIER_PREFIX } },
  });
  if (!record) return { status: "invalid", email: null };

  // Single use: remove it regardless of the outcome below.
  await prisma.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) return { status: "expired", email: null };

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length);
  return { status: "success", email };
}
