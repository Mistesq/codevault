import "server-only";
import { EMAIL_FROM, getAppUrl, getResend } from "./resend";

// Builds and sends the account verification email via Resend.

function verificationEmailHtml(verifyUrl: string, name?: string | null): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0a0a0a;">
    <h1 style="font-size: 20px; margin: 0 0 16px;">Verify your email</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      Thanks for signing up for CodeVault. Confirm your email address to activate your account.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
        Verify email address
      </a>
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
      Or paste this link into your browser:
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; word-break: break-all; margin: 0 0 24px;">
      ${verifyUrl}
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; margin: 0;">
      This link expires in 24 hours. If you didn't create a CodeVault account, you can safely ignore this email.
    </p>
  </div>`;
}

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

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Verify your CodeVault email",
    html: verificationEmailHtml(verifyUrl, name),
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}
