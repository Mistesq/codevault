"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing";
import type { BillingInterval } from "@/lib/billing/plan";

// Monthly / Yearly upgrade buttons. Each starts a Stripe Checkout Session via the
// server action, then redirects the browser to the returned hosted-checkout URL.
// Presentational only — all price/plan logic lives in the action + src/lib/billing.
export function UpgradeButtons() {
  const [pending, setPending] = useState<BillingInterval | null>(null);

  async function startCheckout(interval: BillingInterval) {
    setPending(interval);
    try {
      const result = await createCheckoutSession({ interval });
      if (!result.success) {
        toast.error(result.error);
        setPending(null);
        return;
      }
      // Client-side redirect to Stripe-hosted Checkout (external origin).
      window.location.href = result.data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => startCheckout("monthly")}
        disabled={pending !== null}
      >
        {pending === "monthly" ? "Redirecting…" : "Upgrade — $8/mo"}
      </Button>
      <Button
        variant="outline"
        onClick={() => startCheckout("yearly")}
        disabled={pending !== null}
      >
        {pending === "yearly" ? "Redirecting…" : "Upgrade — $72/yr"}
      </Button>
    </div>
  );
}
