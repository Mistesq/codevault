import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-token";
import { resetPasswordSchema } from "@/lib/validations/auth";

// POST /api/auth/reset-password — complete the forgot-password flow by consuming
// a reset token and setting a new password.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 },
    );
  }

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
