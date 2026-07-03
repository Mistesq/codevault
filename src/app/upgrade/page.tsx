import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { getProfileData } from "@/lib/db/profile";
import { FREE_LIMITS } from "@/lib/billing/plan";
import { UpgradePlans } from "@/components/billing/UpgradePlans";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  // The session is verified by the upgrade layout's AppShell guard. Pro users
  // have nothing to upgrade — send them to Settings to manage their plan.
  const profile = await getProfileData();
  if (profile.isPro) {
    redirect("/settings");
  }

  return (
    <div className="mx-auto max-w-4xl py-4">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="size-6 text-h-accent" />
          Upgrade to Pro
        </h1>
        <p className="mt-2 text-muted-foreground">
          Unlock unlimited items, file uploads, AI features, and more.
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          You&apos;re currently using {profile.totalItems}/{FREE_LIMITS.items}{" "}
          items and {profile.totalCollections}/{FREE_LIMITS.collections}{" "}
          collections.
        </p>
      </div>

      <div className="mt-10">
        <UpgradePlans />
      </div>
    </div>
  );
}
