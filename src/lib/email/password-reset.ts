import "server-only";
import { getAppUrl } from "./resend";
import { buildEmailHtml, sendTransactionalEmail } from "./template";

// Builds and sends the password-reset email via Resend.

/**
 * Send the password-reset email. `rawToken` is the unhashed token that goes in
 * the link; the database only stores its hash. Throws if Resend returns an error
 * so callers can decide how to handle failures.
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
  name?: string | null,
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${rawToken}`;

  const html = buildEmailHtml({
    heading: "Reset your password",
    bodyText:
      "We received a request to reset your CodeVault password. Click the button below to choose a new one.",
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    footerText:
      "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.",
    name,
  });

  await sendTransactionalEmail({
    to,
    subject: "Reset your CodeVault password",
    html,
    failureContext: "password-reset email",
  });
}
