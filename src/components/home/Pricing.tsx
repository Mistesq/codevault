import { PricingToggle } from "./PricingToggle";
import { Reveal } from "./Reveal";

// Static section shell; the interactive toggle + price grid live in the
// PricingToggle client leaf.
export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[1200px] px-6 py-22">
      <Reveal className="mx-auto max-w-[640px] text-center">
        <h2 className="text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold leading-[1.1] tracking-[-0.03em]">
          Simple pricing that scales with you.
        </h2>
        <p className="mt-[0.9rem] text-[1.05rem] text-h-muted">
          Start free. Upgrade when your vault outgrows it.
        </p>
      </Reveal>
      <PricingToggle />
    </section>
  );
}
