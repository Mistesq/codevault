import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/verification";
import { emailSchema } from "@/lib/validations/auth";
import { parseJsonRequest } from "@/lib/api/route-helpers";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

// Generic response used for every outcome so the endpoint never reveals whether
// an account exists or is already verified (no user enumeration).
const GENERIC = {
  message: "If an account needs verification, we've sent a new link.",
};

// POST /api/auth/resend-verification — re-send the verification email.
export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, emailSchema, "Invalid email.");
  if (!parsed.ok) return parsed.response;

  const { email } = parsed.data;

  // Rate limit by IP + email to throttle verification-email spam.
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit(RATE_LIMITS.resendVerification, `${ip}:${email}`);
  if (!limit.success) return tooManyRequestsResponse(limit.reset);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, password: true, emailVerified: true },
    });

    // Only (re)send for an unverified credentials account. OAuth-only accounts
    // (no password) and already-verified users get the same generic response.
    if (user?.password && !user.emailVerified) {
      const token = await createVerificationToken(email);
      await sendVerificationEmail(email, token, user.name);
    }
  } catch (error) {
    console.error("Resend verification failed:", error);
    // Still return generic success — don't leak failures to the client.
  }

  return NextResponse.json(GENERIC, { status: 200 });
}
