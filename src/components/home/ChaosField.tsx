"use client";

import { useEffect, useRef, useState } from "react";
import {
  AppWindow,
  Bookmark,
  FileCode,
  FileText,
  Hash,
  MessagesSquare,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

// Scattered-knowledge sources: assorted "places" your dev context leaks into,
// each tinted. (lucide dropped brand marks, so these are generic stand-ins.)
const ICONS: { Icon: LucideIcon; tint: string }[] = [
  { Icon: MessagesSquare, tint: "#e6e6e6" },
  { Icon: FileCode, tint: "#3b9be6" },
  { Icon: StickyNote, tint: "#e6e6e6" },
  { Icon: Hash, tint: "#d67aa0" },
  { Icon: AppWindow, tint: "#a1a1a1" },
  { Icon: Terminal, tint: "#a1a1a1" },
  { Icon: FileText, tint: "#a1a1a1" },
  { Icon: Bookmark, tint: "#a1a1a1" },
];

const SIZE = 60; // matches the icon box below
const REPEL_RADIUS = 110;

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
};

// Animated field of drifting icons: constant drift + wall bounce + cursor repel
// + a subtle rotation/scale pulse, driven by requestAnimationFrame. Pauses when
// the hero scrolls out of view. Falls back to a static scatter under
// prefers-reduced-motion.
export function ChaosField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const nodes: Node[] = ICONS.map(() => ({
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.6,
    }));

    let bounds = { w: field.clientWidth, h: field.clientHeight };
    const seed = () => {
      bounds = { w: field.clientWidth, h: field.clientHeight };
      nodes.forEach((n) => {
        n.x = Math.random() * Math.max(1, bounds.w - SIZE);
        n.y = Math.random() * Math.max(1, bounds.h - SIZE);
      });
    };
    seed();
    setReady(true);

    const applyStatic = () => {
      nodes.forEach((n, i) => {
        const el = iconRefs.current[i];
        if (el) el.style.transform = `translate(${n.x.toFixed(2)}px,${n.y.toFixed(2)}px)`;
      });
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      applyStatic();
      return;
    }

    const mouse = { x: -9999, y: -9999, active: false };
    const onMove = (e: MouseEvent) => {
      const r = field.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = mouse.y = -9999;
    };
    field.addEventListener("mousemove", onMove);
    field.addEventListener("mouseleave", onLeave);

    const ro = new ResizeObserver(() => {
      const w = field.clientWidth;
      const h = field.clientHeight;
      nodes.forEach((n) => {
        n.x = Math.min(n.x, Math.max(0, w - SIZE));
        n.y = Math.min(n.y, Math.max(0, h - SIZE));
      });
      bounds = { w, h };
    });
    ro.observe(field);

    let raf: number | null = null;
    let t = 0;
    const frame = () => {
      t += 0.016;
      const maxX = Math.max(0, bounds.w - SIZE);
      const maxY = Math.max(0, bounds.h - SIZE);

      nodes.forEach((n, i) => {
        n.x += n.vx;
        n.y += n.vy;

        if (mouse.active) {
          const cx = n.x + SIZE / 2;
          const cy = n.y + SIZE / 2;
          const dx = cx - mouse.x;
          const dy = cy - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            const force = (1 - dist / REPEL_RADIUS) * 1.8;
            n.x += (dx / dist) * force;
            n.y += (dy / dist) * force;
          }
        }

        if (n.x <= 0) {
          n.x = 0;
          n.vx = Math.abs(n.vx);
        } else if (n.x >= maxX) {
          n.x = maxX;
          n.vx = -Math.abs(n.vx);
        }
        if (n.y <= 0) {
          n.y = 0;
          n.vy = Math.abs(n.vy);
        } else if (n.y >= maxY) {
          n.y = maxY;
          n.vy = -Math.abs(n.vy);
        }

        const pulse = Math.sin(t * 1.2 + n.phase);
        const rot = pulse * 6 * n.spin * 4;
        const scale = 1 + pulse * 0.05;
        const el = iconRefs.current[i];
        if (el) {
          el.style.transform = `translate(${n.x.toFixed(2)}px,${n.y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        }
      });

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf === null) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    // Pause the loop while the hero is off-screen to save CPU.
    const heroObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0 },
    );
    heroObserver.observe(field);
    start();

    return () => {
      stop();
      ro.disconnect();
      heroObserver.disconnect();
      field.removeEventListener("mousemove", onMove);
      field.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={fieldRef} aria-hidden className="relative flex-1 overflow-hidden rounded-[0.625rem]">
      {ICONS.map(({ Icon, tint }, i) => (
        <div
          key={i}
          ref={(el) => {
            iconRefs.current[i] = el;
          }}
          style={{ color: tint }}
          className={cnReady(ready)}
        >
          <Icon className="size-[30px]" />
        </div>
      ))}
    </div>
  );
}

// The icon box: absolutely positioned, its transform set imperatively each
// frame. Kept invisible until the effect seeds a position (avoids a flash of all
// eight stacked at the origin, and any SSR/client hydration mismatch).
function cnReady(ready: boolean): string {
  return [
    "absolute grid size-[60px] place-items-center rounded-[0.85rem]",
    "border border-h-border-strong bg-h-surface-3 will-change-transform",
    ready ? "opacity-100" : "opacity-0",
  ].join(" ");
}
