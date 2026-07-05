import "server-only";
import { consumeSingleUseToken, createSingleUseToken } from "@/lib/auth/token";

// Password-reset token helpers backed by the Auth.js `VerificationToken` model.
// To avoid clobbering email-verification tokens (which use `identifier = email`),
// reset tokens namespace the identifier as `password-reset:{email}`. Tokens are
// single-use and expire after 1 hour. The hashing / generation / single-use
// lifecycle lives in `./token`.

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
const IDENTIFIER_PREFIX = "password-reset:";

function identifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

/**
 * Create a fresh password-reset token for an email, invalidating any prior reset
 * tokens for that address. Returns the raw token to embed in the reset link.
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  return createSingleUseToken(identifierFor(email), TOKEN_TTL_MS);
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
  const outcome = await consumeSingleUseToken(rawToken, {
    startsWith: IDENTIFIER_PREFIX,
  });

  if (outcome.status === "invalid") return { status: "invalid", email: null };
  if (outcome.status === "expired") return { status: "expired", email: null };

  const email = outcome.record.identifier.slice(IDENTIFIER_PREFIX.length);
  return { status: "success", email };
}
