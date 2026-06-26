import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown right after registration: tells the user to go verify their email.
export default function CheckEmailPage() {
  return (
    <AuthStatusCard
      icon={<Mail className="size-10 text-foreground" />}
      title="Check your email"
      description="We've sent you a verification link. Please check your inbox."
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
