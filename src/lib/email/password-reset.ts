import "server-only";
import { EMAIL_FROM, getAppUrl, getResend } from "./resend";

// Builds and sends the password-reset email via Resend.

function passwordResetEmailHtml(resetUrl: string, name?: string | null): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0a0a0a;">
    <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      We received a request to reset your CodeVault password. Click the button below to choose a new one.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
        Reset password
      </a>
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
      Or paste this link into your browser:
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; word-break: break-all; margin: 0 0 24px;">
      ${resetUrl}
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; margin: 0;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.
    </p>
  </div>`;
}

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

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Reset your CodeVault password",
    html: passwordResetEmailHtml(resetUrl, name),
  });

  if (error) {
    throw new Error(`Failed to send password-reset email: ${error.message}`);
  }
}
