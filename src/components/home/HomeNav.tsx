"use client";

import { useEffect, useState } from "react";
import { Vault } from "lucide-react";

import { cn } from "@/lib/utils";
import { HomeButton } from "./HomeButton";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#ai", label: "AI" },
  { href: "#pricing", label: "Pricing" },
];

// Fixed marketing nav. Background opacity + blur increase once the page is
// scrolled. When a session exists the Sign in / Get started actions collapse
// into a single Dashboard button.
//
// `sectionBase` prefixes the in-page section anchors so the nav can live on
// pages that don't contain those sections (e.g. the auth pages): pass "/" and
// the anchors resolve to the homepage (`/#features`) and the brand links home.
export function HomeNav({
  isAuthed,
  sectionBase = "",
}: {
  isAuthed: boolean;
  sectionBase?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const brandHref = sectionBase || "#top";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-[250ms]",
        scrolled
          ? "border-h-border bg-[rgba(10,10,10,0.88)] backdrop-blur-[12px]"
          : "border-transparent bg-[rgba(10,10,10,0.55)]",
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-[0.85rem]">
        <a href={brandHref} aria-label="CodeVault home" className="inline-flex items-center gap-[0.6rem]">
          <span className="grid size-8 place-items-center rounded-lg bg-h-brand text-white">
            <Vault className="size-4" />
          </span>
          <span className="flex flex-col leading-[1.15]">
            <span className="text-[0.98rem] font-semibold tracking-[-0.01em]">CodeVault</span>
            <span className="text-[0.72rem] text-h-muted">Knowledge Hub</span>
          </span>
        </a>

        <nav
          aria-label="Primary"
          className="ml-4 flex gap-6 text-[0.9rem] text-h-muted max-[620px]:hidden"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={`${sectionBase}${link.href}`}
              className="transition-colors hover:text-h-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthed ? (
            <HomeButton href="/dashboard">Dashboard</HomeButton>
          ) : (
            <>
              <HomeButton href="/sign-in" variant="ghost" className="max-[620px]:hidden">
                Sign in
              </HomeButton>
              <HomeButton href="/register">Get started</HomeButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
