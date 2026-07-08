import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-token";
import { DEMO_ACCOUNT_ERROR } from "@/lib/demo/guard";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { parseJsonRequest } from "@/lib/api/route-helpers";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

// POST /api/auth/reset-password — complete the forgot-password flow by consuming
// a reset token and setting a new password.
export async function POST(request: Request) {
  // Rate limit by IP to stop brute-forcing reset tokens.
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit(RATE_LIMITS.passwordReset, ip);
  if (!limit.success) return tooManyRequestsResponse(limit.reset);

  const parsed = await parseJsonRequest(request, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const { token, password } = parsed.data;

  try {
    const result = await consumePasswordResetToken(token);

    if (result.status !== "success") {
      // Expired or invalid/already-used token.
      return NextResponse.json(
        {
          error:
            result.status === "expired"
              ? "That reset link has expired. Please request a new one."
              : "That reset link is invalid or has already been used.",
        },
        { status: 400 },
      );
    }

    // The shared demo account's published credentials must never change — the
    // reset flow is a password-change path, so it gets the same server guard.
    const target = await prisma.user.findUnique({
      where: { email: result.email },
      select: { isDemo: true },
    });
    if (target?.isDemo) {
      return NextResponse.json({ error: DEMO_ACCOUNT_ERROR }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // updateMany (not update) so a since-deleted account doesn't throw.
    await prisma.user.updateMany({
      where: { email: result.email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
