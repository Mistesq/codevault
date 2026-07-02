import { HomeButton } from "./HomeButton";
import { Reveal } from "./Reveal";

export function Cta() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-8 pb-22">
      <Reveal className="rounded-[1rem] border border-h-border bg-h-surface-1 px-8 py-16 text-center">
        <h2 className="text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold tracking-[-0.03em]">
          Ready to organize your knowledge?
        </h2>
        <p className="mx-auto mt-4 mb-8 max-w-[480px] text-[1.05rem] text-h-muted">
          Join developers who stopped losing snippets, prompts, and commands to a dozen scattered
          apps.
        </p>
        <HomeButton href="/register" size="lg">
          Get started free
        </HomeButton>
      </Reveal>
    </section>
  );
}
