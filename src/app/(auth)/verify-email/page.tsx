import Link from "next/link";
import { CircleAlert, CircleCheckBig } from "lucide-react";

import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Result page for the email verification link. The token is consumed by the
// /api/auth/verify-email route, which then redirects here with ?status=…
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === "success") {
    return (
      <AuthStatusCard
        icon={<CircleCheckBig className="size-10 text-green-500" />}
        title="Email Verified!"
        description="Email verified successfully."
      >
        <Link href="/sign-in" className={cn(buttonVariants(), "w-full")}>
          Sign in to your account
        </Link>
      </AuthStatusCard>
    );
  }

  const description =
    status === "expired"
      ? "That verification link has expired. Try signing in to request a new one."
      : "That verification link is invalid or has already been used.";

  return (
    <AuthStatusCard
      icon={<CircleAlert className="size-10 text-destructive" />}
      title="Verification failed"
      description={description}
    >
      <Link
        href="/sign-in"
        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
      >
        Back to sign in
      </Link>
    </AuthStatusCard>
  );
}
