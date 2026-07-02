/* ============================================================
   CodeVault homepage — interactions
   1. Chaos icons: requestAnimationFrame drift + wall bounce +
      cursor repel + subtle rotation/scale pulse.
   2. Scroll reveal (IntersectionObserver).
   3. Navbar opacity on scroll.
   4. Pricing monthly/yearly toggle.
   5. Footer year.
   ============================================================ */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- 5. footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 3. navbar opacity on scroll ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 2. scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- 4. pricing toggle ---------- */
  const toggle = document.querySelector(".billing-toggle");
  if (toggle) {
    const buttons = toggle.querySelectorAll(".bt");
    const swap = (period) => {
      buttons.forEach((b) => {
        const active = b.dataset.period === period;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      document
        .querySelectorAll("[data-" + period + "]")
        .forEach((el) => {
          el.textContent = el.getAttribute("data-" + period);
        });
    };
    buttons.forEach((b) =>
      b.addEventListener("click", () => swap(b.dataset.period))
    );
  }

  /* ---------- 1. chaos animation ---------- */
  const field = document.getElementById("chaosField");
  if (!field) return;

  // Scattered-knowledge sources: 4 tool logos + 4 generic places.
  const ICONS = [
    { id: "i-github", tint: "#e6e6e6" },
    { id: "i-vscode", tint: "#3b9be6" },
    { id: "i-notion", tint: "#e6e6e6" },
    { id: "i-slack", tint: "#d67aa0" },
    { id: "i-window", tint: "#a1a1a1" },
    { id: "i-terminal", tint: "#a1a1a1" },
    { id: "i-file-text", tint: "#a1a1a1" },
    { id: "i-bookmark", tint: "#a1a1a1" },
  ];

  const SIZE = 60; // matches .chaos-icon in CSS
  const nodes = [];
  const mouse = { x: -9999, y: -9999, active: false };

  ICONS.forEach((cfg) => {
    const el = document.createElement("div");
    el.className = "chaos-icon";
    el.style.color = cfg.tint;
    el.innerHTML =
      '<svg class="ic" viewBox="0 0 24 24"><use href="#' + cfg.id + '"/></svg>';
    field.appendChild(el);
    nodes.push({
      el,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      // per-icon pulse phase/speed so they don't move in lockstep
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.6,
    });
  });

  let bounds = { w: field.clientWidth, h: field.clientHeight };

  function seed() {
    bounds = { w: field.clientWidth, h: field.clientHeight };
    nodes.forEach((n) => {
      n.x = Math.random() * Math.max(1, bounds.w - SIZE);
      n.y = Math.random() * Math.max(1, bounds.h - SIZE);
    });
  }
  seed();

  const ro = new ResizeObserver(() => {
    const w = field.clientWidth;
    const h = field.clientHeight;
    // keep nodes inside the new bounds without full reshuffle
    nodes.forEach((n) => {
      n.x = Math.min(n.x, Math.max(0, w - SIZE));
      n.y = Math.min(n.y, Math.max(0, h - SIZE));
    });
    bounds = { w, h };
  });
  ro.observe(field);

  field.addEventListener("mousemove", (e) => {
    const r = field.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
  });
  field.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.x = mouse.y = -9999;
  });

  const REPEL_RADIUS = 110;
  let t = 0;

  function frame() {
    t += 0.016;
    const maxX = Math.max(0, bounds.w - SIZE);
    const maxY = Math.max(0, bounds.h - SIZE);

    for (const n of nodes) {
      // gentle constant drift
      n.x += n.vx;
      n.y += n.vy;

      // repel from cursor (center-to-center)
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

      // bounce off walls
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

      // subtle rotation + scale pulse
      const pulse = Math.sin(t * 1.2 + n.phase);
      const rot = pulse * 6 * n.spin * 4;
      const scale = 1 + pulse * 0.05;
      n.el.style.transform =
        "translate(" +
        n.x.toFixed(2) +
        "px," +
        n.y.toFixed(2) +
        "px) rotate(" +
        rot.toFixed(2) +
        "deg) scale(" +
        scale.toFixed(3) +
        ")";
    }
    raf = requestAnimationFrame(frame);
  }

  let raf;
  if (prefersReduced) {
    // static scatter, no motion
    nodes.forEach((n) => {
      n.el.style.transform =
        "translate(" + n.x.toFixed(2) + "px," + n.y.toFixed(2) + "px)";
    });
  } else {
    raf = requestAnimationFrame(frame);
    // pause when the hero scrolls out of view (save CPU)
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!raf) raf = requestAnimationFrame(frame);
          } else if (raf) {
            cancelAnimationFrame(raf);
            raf = null;
          }
        });
      },
      { threshold: 0 }
    );
    heroObserver.observe(field);
  }
})();
