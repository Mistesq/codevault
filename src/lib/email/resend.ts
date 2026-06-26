import "server-only";
import { Resend } from "resend";

// Resend client + shared email config. Kept server-only so the API key never
// leaks into a client bundle.

let client: Resend | null = null;

/** Lazily instantiate the Resend client; throws if the API key is missing. */
export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — cannot send email.");
  }
  client ??= new Resend(apiKey);
  return client;
}

/** The verified sender address; falls back to Resend's shared dev sender. */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "CodeVault <onboarding@resend.dev>";

/** Absolute base URL for building links in emails. */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
