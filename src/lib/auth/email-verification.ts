import "server-only";

// Single source of truth for whether the email-verification system is active.
//
// Controlled by the EMAIL_VERIFICATION_ENABLED env var. Secure by default:
// verification is ON unless explicitly disabled with a falsy value
// (false / 0 / off, case-insensitive). Server-only — never expose this to the
// client; the register API tells the client whether verification was required.
export function isEmailVerificationEnabled(): boolean {
  const raw = process.env.EMAIL_VERIFICATION_ENABLED?.trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}
