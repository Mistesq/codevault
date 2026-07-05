import "server-only";
import { getAppUrl } from "./resend";
import { buildEmailHtml, sendTransactionalEmail } from "./template";

// Builds and sends the account verification email via Resend.

/**
 * Send the verification email. `rawToken` is the unhashed token that goes in the
 * link; the database only stores its hash. Throws if Resend returns an error so
 * callers can decide how to handle failures.
 */
export async function sendVerificationEmail(
  to: string,
  rawToken: string,
  name?: string | null,
): Promise<void> {
  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${rawToken}`;

  const html = buildEmailHtml({
    heading: "Verify your email",
    bodyText:
      "Thanks for signing up for CodeVault. Confirm your email address to activate your account.",
    ctaLabel: "Verify email address",
    ctaUrl: verifyUrl,
    footerText:
      "This link expires in 24 hours. If you didn't create a CodeVault account, you can safely ignore this email.",
    name,
  });

  await sendTransactionalEmail({
    to,
    subject: "Verify your CodeVault email",
    html,
    failureContext: "verification email",
  });
}
