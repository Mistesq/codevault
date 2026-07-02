import { ArrowRight } from "lucide-react";

import { ChaosField } from "./ChaosField";
import { DashboardPreview } from "./DashboardPreview";
import { HomeButton } from "./HomeButton";
import { Reveal } from "./Reveal";

// Hero: left-aligned copy + the chaos → arrow → dashboard visual. The chaos
// panel and dashboard replica are weighted asymmetrically (0.85fr / 1.35fr) so
// "order" dominates; on narrow screens the three stack and the arrow rotates.
export function Hero() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-36 pb-16 max-[620px]:pt-28">
      <Reveal className="max-w-[640px]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-h-border bg-h-surface-1 px-3 py-[0.35rem] text-[0.82rem] text-h-muted">
          <span className="size-[7px] rounded-full bg-h-accent" /> Your developer knowledge, in one vault
        </div>
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)] font-bold leading-[1.02] tracking-[-0.04em]">
          Stop losing your
          <br />
          developer <span className="text-h-accent">knowledge</span>.
        </h1>
        <p className="mt-6 max-w-[560px] text-[1.15rem] leading-[1.6] text-h-muted">
          Snippets in your editor. Prompts buried in chat history. Commands in a{" "}
          <code className="rounded-[0.3rem] border border-h-border bg-h-surface-2 px-[0.35em] py-[0.1em] font-mono text-[0.85em] text-h-text">
            .txt
          </code>{" "}
          somewhere. CodeVault pulls it all into one searchable, AI-enhanced hub — so you find things
          in seconds, not tabs.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <HomeButton href="/register" size="lg">
            Get started free
          </HomeButton>
          <HomeButton href="#ai" variant="outline" size="lg">
            See how it works
          </HomeButton>
        </div>
        <p className="mt-4 text-[0.85rem] text-h-dim">
          Free forever plan · No credit card required
        </p>
      </Reveal>

      <Reveal className="mt-[4.5rem] grid grid-cols-[0.85fr_auto_1.35fr] items-center gap-6 max-[940px]:mx-auto max-[940px]:max-w-[520px] max-[940px]:grid-cols-1 max-[940px]:gap-4">
        {/* chaos */}
        <div className="relative flex min-h-[340px] flex-col rounded-[1rem] border border-h-border bg-h-surface-1 p-4">
          <div className="mb-3 text-[0.8rem] font-medium text-h-muted">Your knowledge today…</div>
          <ChaosField />
          <div className="mt-3 text-center text-[0.78rem] text-h-dim">8 places. Zero search.</div>
        </div>

        {/* arrow */}
        <div aria-hidden className="grid place-items-center text-h-accent max-[940px]:rotate-90">
          <ArrowRight className="size-[34px] animate-home-arrow motion-reduce:animate-none" />
        </div>

        {/* order: dashboard replica */}
        <div className="relative rounded-[1rem] border border-h-border bg-h-surface-1 p-[0.85rem]">
          <div className="mb-3 text-[0.8rem] font-medium text-h-muted">…with CodeVault</div>
          <DashboardPreview />
        </div>
      </Reveal>
    </section>
  );
}
