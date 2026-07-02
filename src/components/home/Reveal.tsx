"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Scroll-reveal wrapper: fades + lifts its content into view the first time it
// intersects the viewport. One shared utility reused across every section
// (replaces the prototype's global `[data-reveal]` observer). Honours
// prefers-reduced-motion by showing content immediately.
export function Reveal({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Show immediately in the rare no-IntersectionObserver case; otherwise the
  // observer flips this once the element scrolls into view. Under reduced motion
  // the CSS transition is disabled, so the reveal simply appears without a fade.
  const [shown, setShown] = useState(
    () => typeof window !== "undefined" && !("IntersectionObserver" in window),
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "transition-all duration-[600ms] ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-[18px] opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
