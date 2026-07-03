"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { HomeButton } from "./HomeButton";

type Period = "monthly" | "yearly";

const FREE_FEATS = [
  "Up to 50 items",
  "3 collections",
  "Full-text search",
  "Image uploads",
  "Dark mode",
];

const PRO_FEATS = [
  "Unlimited items & collections",
  "All AI features",
  "Custom item types",
  "File uploads",
  "Export to JSON / ZIP",
];

const PRO_PRICE: Record<Period, { amount: string; per: string; note: string }> = {
  monthly: { amount: "$8", per: "/ month", note: "Billed monthly" },
  yearly: { amount: "$6", per: "/ mo, billed yearly", note: "$72 billed once a year" },
};

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 grid list-none gap-[0.7rem]">
      {items.map((feat) => (
        <li key={feat} className="flex items-center gap-[0.6rem] text-[0.92rem] text-h-muted">
          <Check className="size-4 shrink-0 text-h-accent" />
          {feat}
        </li>
      ))}
    </ul>
  );
}

// Owns the Monthly/Yearly state and renders both the toggle and the price grid
// it controls (Pro's amount/period/note swap; Free is static). Kept as the only
// interactive leaf of the otherwise-static Pricing section.
export function PricingToggle() {
  const [period, setPeriod] = useState<Period>("monthly");
  const pro = PRO_PRICE[period];

  return (
    <>
      <div className="mt-6 mb-12 text-center">
        <div
          role="tablist"
          aria-label="Billing period"
          className="inline-flex gap-1 rounded-full border border-h-border bg-h-surface-1 p-1"
        >
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "cursor-pointer rounded-full px-5 py-[0.6rem] text-[0.85rem] font-medium capitalize transition-colors",
                period === p ? "bg-h-surface-3 text-h-text" : "text-h-muted",
              )}
            >
              {p}
              {p === "yearly" && <span className="ml-[0.3rem] text-[0.75rem] text-h-accent">Save 25%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(2,minmax(0,380px))] items-start justify-center gap-5 max-[620px]:grid-cols-1">
        {/* Free */}
        <article className="relative rounded-[1rem] border border-h-border bg-h-surface-1 p-7">
          <div>
            <h3 className="text-[1.3rem] tracking-[-0.01em]">Free</h3>
            <p className="mt-[0.3rem] text-[0.9rem] text-h-muted">
              For getting your essentials in order.
            </p>
          </div>
          <div className="my-[1.4rem] flex flex-wrap items-baseline gap-[0.4rem]">
            <span className="text-[2.6rem] font-bold leading-none tracking-[-0.03em]">$0</span>
            <span className="text-[0.95rem] text-h-muted">/ forever</span>
          </div>
          <HomeButton href="/register" variant="outline" block>
            Get started
          </HomeButton>
          <FeatureList items={FREE_FEATS} />
        </article>

        {/* Pro */}
        <article className="relative rounded-[1rem] border border-h-accent bg-h-surface-2 p-7">
          <div className="absolute -top-[0.7rem] right-6 rounded-full bg-h-accent-strong px-[0.7rem] py-1 text-[0.72rem] font-semibold text-white">
            Most popular
          </div>
          <div>
            <h3 className="text-[1.3rem] tracking-[-0.01em]">Pro</h3>
            <p className="mt-[0.3rem] text-[0.9rem] text-h-muted">
              For builders who live in their vault.
            </p>
          </div>
          <div className="my-[1.4rem] flex flex-wrap items-baseline gap-[0.4rem]">
            <span className="text-[2.6rem] font-bold leading-none tracking-[-0.03em]">
              {pro.amount}
            </span>
            <span className="text-[0.95rem] text-h-muted">{pro.per}</span>
            <span className="mt-[0.1rem] w-full text-[0.8rem] text-h-dim">{pro.note}</span>
          </div>
          <HomeButton href="/register" block>
            Upgrade to Pro
          </HomeButton>
          <FeatureList items={PRO_FEATS} />
        </article>
      </div>
    </>
  );
}
