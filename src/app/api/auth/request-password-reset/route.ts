import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { emailSchema } from "@/lib/validations/auth";
import { parseJsonRequest } from "@/lib/api/route-helpers";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

// Generic response used for every outcome so the endpoint never reveals whether
// an account exists (no user enumeration).
const GENERIC = {
  message: "If an account exists for that email, we've sent a reset link.",
};

// POST /api/auth/request-password-reset — start the forgot-password flow.
export async function POST(request: Request) {
  // Rate limit by IP to prevent abusing the reset email as a spam vector.
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit(RATE_LIMITS.passwordResetRequest, ip);
  if (!limit.success) return tooManyRequestsResponse(limit.reset);

  const parsed = await parseJsonRequest(request, emailSchema, "Invalid email.");
  if (!parsed.ok) return parsed.response;

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, password: true },
    });

    // Only send for an existing credentials account. OAuth-only accounts (no
    // password) and unknown emails get the same generic response.
    if (user?.password) {
      const token = await createPasswordResetToken(email);
      await sendPasswordResetEmail(email, token, user.name);
    }
  } catch (error) {
    console.error("Password reset request failed:", error);
    // Still return generic success — don't leak failures to the client.
  }

  return NextResponse.json(GENERIC, { status: 200 });
}
