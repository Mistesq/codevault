import { Lock } from "lucide-react";

import { UpgradeButtons } from "@/components/billing/UpgradeButtons";
import { TypeIcon, typeLabel } from "@/lib/type-icons";

interface ProTypeUpsellProps {
  // The gated system item type (e.g. "file", "image").
  typeName: string;
  icon: string | null;
  color: string | null;
}

// Shown in place of the File / Image listing when a Free user visits those
// pages. Those item types are Pro-only, so we surface an upgrade CTA instead of
// the list. Presentational only — the gating decision lives in the page.
export function ProTypeUpsell({ typeName, icon, color }: ProTypeUpsellProps) {
  const label = typeLabel(typeName);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <span
        className="relative flex size-14 items-center justify-center rounded-xl bg-muted"
        style={color ? { color } : undefined}
      >
        <TypeIcon name={icon} className="size-7" />
        <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          <Lock className="size-3" />
        </span>
      </span>

      <div className="space-y-2">
        <h1 className="text-lg font-semibold">{label}s are a Pro feature</h1>
        <p className="text-sm text-muted-foreground">
          Upgrade to CodeVault Pro to store and organize {label.toLowerCase()}s,
          plus unlimited items, custom types, AI features, and more.
        </p>
      </div>

      <UpgradeButtons />
    </div>
  );
}
