"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createCheckoutSession } from "@/actions/billing";
import type { BillingInterval } from "@/lib/billing/plan";

interface Feature {
  text: string;
  included: boolean;
}

const FREE_FEATURES: Feature[] = [
  { text: "50 items", included: true },
  { text: "3 collections", included: true },
  { text: "Snippets, Prompts, Commands, Notes, Links", included: true },
  { text: "Full-text search", included: true },
  { text: "File & image uploads", included: false },
  { text: "AI features", included: false },
];

const PRO_FEATURES: Feature[] = [
  { text: "Unlimited items", included: true },
  { text: "Unlimited collections", included: true },
  { text: "File & image uploads", included: true },
  { text: "Custom item types", included: true },
  { text: "AI tagging, summaries & Explain Code", included: true },
  { text: "Export to JSON / ZIP", included: true },
];

// Price + CTA copy per interval. Yearly shows the effective monthly rate with the
// annual total noted below, mirroring the homepage pricing section.
const PRO_PRICE: Record<
  BillingInterval,
  { amount: string; note: string; cta: string }
> = {
  monthly: { amount: "$8", note: "For builders who live in their vault.", cta: "Upgrade — $8/mo" },
  yearly: { amount: "$6", note: "$72 billed once a year — save 25%.", cta: "Upgrade — $72/yr" },
};

function FeatureList({ features }: { features: Feature[] }) {
  return (
    <ul className="mt-6 grid gap-3">
      {features.map((f) => (
        <li
          key={f.text}
          className={cn(
            "flex items-center gap-2.5 text-sm",
            f.included ? "text-foreground/90" : "text-muted-foreground/60",
          )}
        >
          {f.included ? (
            <Check className="size-4 shrink-0 text-h-accent" />
          ) : (
            <X className="size-4 shrink-0 text-muted-foreground/40" />
          )}
          {f.text}
        </li>
      ))}
    </ul>
  );
}

// Upgrade plan picker for /upgrade. Owns the Monthly/Yearly toggle and starts a
// Stripe Checkout Session for the selected interval, redirecting the browser to
// the hosted-checkout URL. Presentational + redirect only — price/plan logic
// lives in the action + src/lib/billing.
export function UpgradePlans() {
  const [yearly, setYearly] = useState(false);
  const [pending, setPending] = useState(false);
  const interval: BillingInterval = yearly ? "yearly" : "monthly";
  const pro = PRO_PRICE[interval];

  async function startCheckout() {
    setPending(true);
    try {
      const result = await createCheckoutSession({ interval });
      if (!result.success) {
        toast.error(result.error);
        setPending(false);
        return;
      }
      // Client-side redirect to Stripe-hosted Checkout (external origin).
      window.location.href = result.data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div>
      {/* Billing period toggle */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            yearly ? "text-muted-foreground" : "text-foreground",
          )}
        >
          Monthly
        </span>
        <Switch
          checked={yearly}
          onCheckedChange={setYearly}
          aria-label="Toggle yearly billing"
        />
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            yearly ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Yearly
        </span>
        <span className="rounded-full bg-h-accent-soft px-2 py-0.5 text-xs font-medium text-h-accent">
          Save 25%
        </span>
      </div>

      <div className="grid items-stretch gap-5 sm:grid-cols-2">
        {/* Free (current plan) */}
        <article className="flex flex-col rounded-xl border border-border bg-card p-7">
          <h2 className="text-lg font-semibold">Free</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">$0</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Your current plan.</p>
          <FeatureList features={FREE_FEATURES} />
          <Button variant="outline" className="mt-8 w-full" disabled>
            Current plan
          </Button>
        </article>

        {/* Pro */}
        <article className="relative flex flex-col rounded-xl border border-h-accent bg-h-accent-soft p-7 shadow-[0_0_0_1px_var(--color-h-accent-soft),0_12px_40px_-12px_var(--color-h-accent-soft)]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-h-accent-strong px-3 py-0.5 text-xs font-semibold text-white">
            Recommended
          </span>
          <h2 className="text-lg font-semibold">Pro</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{pro.amount}</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{pro.note}</p>
          <FeatureList features={PRO_FEATURES} />
          <Button
            className="mt-8 w-full bg-h-accent-strong text-white hover:bg-h-accent-strong-hover"
            onClick={startCheckout}
            disabled={pending}
          >
            {pending ? "Redirecting…" : pro.cta}
          </Button>
        </article>
      </div>
    </div>
  );
}
