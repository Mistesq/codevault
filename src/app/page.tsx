import type { Metadata } from "next";

import { auth } from "@/auth";
import { AiSection } from "@/components/home/AiSection";
import { Cta } from "@/components/home/Cta";
import { Features } from "@/components/home/Features";
import { Hero } from "@/components/home/Hero";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";
import { Pricing } from "@/components/home/Pricing";

export const metadata: Metadata = {
  title: "CodeVault — Store Smarter. Build Faster.",
  description:
    "CodeVault is a developer knowledge hub for snippets, AI prompts, commands, notes, files, and links — one searchable place instead of a dozen.",
};

export default async function HomePage() {
  const session = await auth();
  const isAuthed = Boolean(session?.user);

  return (
    <div className="home flex-1 overflow-x-hidden bg-h-bg text-h-text">
      <HomeNav isAuthed={isAuthed} />
      <main id="top">
        <Hero />
        <Features />
        <AiSection />
        <Pricing />
        <Cta />
      </main>
      <HomeFooter year={new Date().getFullYear()} />
    </div>
  );
}
