import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/auth/UserAvatar";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const { name, email, image } = session.user;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <UserAvatar name={name ?? "User"} image={image} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{name ?? "User"}</h1>
            {email && (
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Profile settings are coming soon.
        </p>
      </div>
    </div>
  );
}
