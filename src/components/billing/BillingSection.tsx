import { UpgradeButtons } from "@/components/billing/UpgradeButtons";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";

interface BillingSectionProps {
  isPro: boolean;
}

// Billing card for /settings. Server component: renders the current plan and the
// appropriate action (Upgrade for Free, Manage subscription for Pro). All
// interactivity lives in the two client buttons.
export function BillingSection({ isPro }: BillingSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Billing</h2>
        <span
          className={
            isPro
              ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {isPro ? "Pro" : "Free"}
        </span>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {isPro
          ? "You're on CodeVault Pro — unlimited items, collections, file uploads, and more."
          : "You're on the Free plan (50 items, 3 collections, images only). Upgrade to Pro for unlimited storage and file uploads."}
      </p>

      <div className="mt-6 border-t border-border pt-6">
        {isPro ? <ManageSubscriptionButton /> : <UpgradeButtons />}
      </div>
    </section>
  );
}
