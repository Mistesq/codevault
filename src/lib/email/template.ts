import "server-only";
import { EMAIL_FROM, getResend } from "./resend";

// Shared scaffold for CodeVault's transactional emails: the HTML shell (container,
// greeting, CTA button, "paste this link" block, footer) plus the Resend send +
// error-shaping call. Individual emails supply only their copy.

type EmailContent = {
  heading: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  footerText: string;
  name?: string | null;
};

/** Render the standard CodeVault email HTML for a single-CTA transactional email. */
export function buildEmailHtml({
  heading,
  bodyText,
  ctaLabel,
  ctaUrl,
  footerText,
  name,
}: EmailContent): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0a0a0a;">
    <h1 style="font-size: 20px; margin: 0 0 16px;">${heading}</h1>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      ${bodyText}
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${ctaUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
        ${ctaLabel}
      </a>
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
      Or paste this link into your browser:
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; word-break: break-all; margin: 0 0 24px;">
      ${ctaUrl}
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #6b7280; margin: 0;">
      ${footerText}
    </p>
  </div>`;
}

/**
 * Send a transactional email via Resend. Throws with `failureContext` in the
 * message if Resend returns an error, so callers can decide how to handle it.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  failureContext,
}: {
  to: string;
  subject: string;
  html: string;
  failureContext: string;
}): Promise<void> {
  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send ${failureContext}: ${error.message}`);
  }
}
