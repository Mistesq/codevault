import "server-only";
import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Shared primitive for single-use, hashed, expiring tokens backed by the Auth.js
// `VerificationToken` model. The raw token is only ever sent in an email link;
// the database stores a SHA-256 hash so a DB leak can't be used to act on the
// account. Both email-verification and password-reset tokens build on this.

/** SHA-256 hash of a raw token — this is what we persist and look up by. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Cryptographically random raw token to embed in a link (64 hex chars). */
export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a fresh token for an identifier, invalidating any prior tokens for that
 * same identifier. Returns the raw token to embed in the link; only the hash is
 * stored.
 */
export async function createSingleUseToken(
  identifier: string,
  ttlMs: number,
): Promise<string> {
  const rawToken = generateRawToken();
  const token = hashToken(rawToken);
  const expires = new Date(Date.now() + ttlMs);

  // One pending token per identifier: drop older ones so old links stop working.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return rawToken;
}

type TokenRecord = { identifier: string; token: string; expires: Date };

export type ConsumeOutcome =
  | { status: "invalid"; record: null }
  | { status: "expired"; record: TokenRecord }
  | { status: "valid"; record: TokenRecord };

/**
 * Look up a raw token constrained to `identifierFilter` (so tokens of one kind
 * can't be consumed via another kind's path). The token is always deleted
 * (single use) once a matching record is found, whether it was valid or expired.
 * Callers map the outcome to their own result shape.
 */
export async function consumeSingleUseToken(
  rawToken: string,
  identifierFilter: Prisma.StringFilter,
): Promise<ConsumeOutcome> {
  const token = hashToken(rawToken);

  const record = await prisma.verificationToken.findFirst({
    where: { token, identifier: identifierFilter },
  });
  if (!record) return { status: "invalid", record: null };

  // Single use: remove it regardless of the outcome below.
  await prisma.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) return { status: "expired", record };

  return { status: "valid", record };
}
