import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/verification";
import { registerSchema } from "@/lib/validations/auth";

// POST /api/auth/register — create a new email/password account.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    // Surface the first validation message for a friendly response.
    const message =
      parsed.error.issues[0]?.message ?? "Invalid registration details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationRequired = isEmailVerificationEnabled();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // When verification is disabled, mark the account verified up front so
        // it isn't gated now or if verification is re-enabled later.
        emailVerified: verificationRequired ? null : new Date(),
      },
      select: { id: true, name: true, email: true },
    });

    if (verificationRequired) {
      // Send the verification email. A delivery failure shouldn't fail the
      // registration — the account exists and the user can request a new link.
      try {
        const token = await createVerificationToken(email);
        await sendVerificationEmail(email, token, name);
      } catch (error) {
        console.error("Verification email failed to send:", error);
      }
    }

    // verificationRequired tells the client where to send the user next
    // (check-your-email vs straight to sign-in).
    return NextResponse.json(
      { success: true, user, verificationRequired },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
