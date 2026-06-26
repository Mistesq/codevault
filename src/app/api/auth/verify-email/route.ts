import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/auth/verification-token";
import { getAppUrl } from "@/lib/email/resend";

// GET /api/auth/verify-email?token=… — target of the email verification link.
// Validates the token, marks the email verified, then redirects to the
// /verify-email result page which shows a success or failure dialog.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = new URL("/verify-email", getAppUrl());

  // Missing token is treated as invalid.
  const status = token ? await consumeVerificationToken(token) : "invalid";
  result.searchParams.set("status", status);

  return NextResponse.redirect(result);
}
