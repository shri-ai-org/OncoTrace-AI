import { useEffect, useRef } from "react";
import { useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { DISPERSED_AT, generateParticles, renderFrame } from "../../lib/bloodDropParticles";
import { heroHold } from "../../lib/layout";

/* The hero's particle blood drop. About 600-2,000 crimson particles on a 2D
   canvas form a drop that breaks apart, drifting right, as the visitor
   scrolls, and reassembles on the way back up.

   Scroll drives everything through motion values (useScroll -> useTransform
   -> useSpring): React never re-renders on scroll. A single rAF loop draws
   while the canvas is on screen, idles at 30fps while nothing moves, and
   sleeps once the drop has fully dispersed.

   The markup is a plain, empty canvas on the server and the client alike,
   sized by CSS (.ot-hero-visual in ui/Hero.css): no hydration mismatch, no
   layout shift. Purely decorative: aria-hidden, pointer-events: none. */

const MAX_DEVICE_PIXELS = 1.3e6;
const INTRO_SECONDS = 1.1;
const LG = "(min-width: 1024px)";

function particleCount(dropHeight) {
  const nav = typeof navigator === "undefined" ? {} : navigator;
  const lowPower = (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4)
    || (nav.deviceMemory && nav.deviceMemory <= 4)
    || nav.connection?.saveData;
  const n = Math.min(2000, Math.max(600, dropHeight * 6)) * (lowPower ? 0.65 : 1);
  return Math.round(n / 100) * 100; // buckets: regenerate only on real changes
}

export default function BloodDropParticles() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const wakeRef = useRef(() => {});
  const reduced = useReducedMotion();

  // Scroll progress 0..1 across the hero. `start` delays it until the drop is
  // fully on screen (short phones); `range` is most of the hero's height.
  const { scrollY } = useScroll();
  const start = useMotionValue(0);
  const range = useMotionValue(1);
  const progress = useTransform([scrollY, start, range], ([y, s, r]) => {
    const v = (y - s) / r;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  });
  // Gliding but overdamped (no bounce): smooths discrete wheel notches into
  // one continuous dissolve. The hero only glides slowly while this plays,
  // so the ~0.3s glide reads as smoothness, not lag.
  const smoothed = useSpring(progress, { stiffness: 170, damping: 28, mass: 0.6, restDelta: 0.0005 });
  useMotionValueEvent(smoothed, "change", () => wakeRef.current());

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.("2d");
    if (!wrap || !ctx) return undefined;

    const section = wrap.closest("section");
    const arc = section?.querySelector(".ot-hero-arc");
    const lg = window.matchMedia(LG);
    const still = !!reduced;

    let particles = [];
    let count = 0;
    const geo = { width: 0, height: 0, dpr: 1, cx: 0, top: 0, size: 0, dotScale: 1 };
    let raf = 0;
    let visible = true;
    let born = -1; // time the intro started (s), -1 = not yet
    let lastDraw = -1;
    let lastP = -1;
    // No gather-in intro when the page opens already scrolled past the drop.
    const skipIntro = still || smoothed.get() > 0.05;

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (!width || !height) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_DEVICE_PIXELS / (width * height)));
      const bw = Math.round(width * dpr);
      const bh = Math.round(height * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }

      let size, cx, top;
      if (lg.matches) {
        // Desktop: centred in the column, in the space above the globe.
        // offsetTop (layout position) rather than getBoundingClientRect: the
        // arc's entrance animation shifts it with a transform at first.
        const globeTop = arc ? arc.offsetTop - wrap.offsetTop : height;
        const region = Math.max(120, Math.min(height, globeTop) - 24);
        size = Math.min(region * 0.78, (width * 0.8) / 0.65, 400);
        cx = width * 0.47;
        top = 12 + (region - size) / 2;
      } else {
        // Phones / portrait tablets: fills the strip below the copy.
        size = height * 0.9;
        cx = width / 2;
        top = (height - size) / 2;
      }
      // Dots grow a little with the drop so large drops keep their body.
      const dotScale = Math.min(1.2, Math.max(0.85, size / 320));
      Object.assign(geo, { width, height, dpr, cx, top, size, dotScale });

      const n = particleCount(size);
      if (n !== count) {
        count = n;
        particles = generateParticles(n);
      }

      // Progress mapping.
      const hold = heroHold(section);
      if (hold) {
        // Held hero (Hero `hold`): the drop dissolves while the hero glides
        // slowly, and is gone just before the page returns to full speed.
        start.set(hold.start);
        range.set(hold.distance * 0.9);
      } else {
        // No hold: begin once the drop's bottom is in view.
        const dropBottom = rect.top + window.scrollY + top + size;
        start.set(Math.max(0, dropBottom - window.innerHeight + 8));
        range.set(Math.max(240, section.offsetHeight * 0.75));
      }
      return true;
    };

    const draw = (now) => {
      const t = now / 1000;
      if (born < 0) born = t;
      const intro = skipIntro ? 1 : Math.min(1, (t - born) / INTRO_SECONDS);
      const p = still ? 0 : smoothed.get();
      try {
        renderFrame(ctx, particles, { ...geo, p, time: t, intro, still });
      } catch {
        stop();
        return;
      }
      lastP = p;
      lastDraw = t;
    };

    const tick = (now) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const p = smoothed.get();
      const moving = Math.abs(smoothed.getVelocity()) > 0.0005 || Math.abs(p - lastP) > 0.0002;
      const t = now / 1000;
      const introDone = skipIntro || (born >= 0 && t - born >= INTRO_SECONDS);

      // Fully dispersed and at rest: one last (empty) frame, then sleep until
      // the progress changes again.
      if (p >= DISPERSED_AT && !moving) {
        if (lastP < DISPERSED_AT) draw(now);
        return;
      }
      // At rest: the shimmer only needs 30fps.
      if (moving || !introDone || t - lastDraw >= 1 / 31) draw(now);
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!still && !raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    let resizeQueued = 0;
    const onResize = () => {
      if (resizeQueued) return;
      resizeQueued = requestAnimationFrame(() => {
        resizeQueued = 0;
        if (!layout()) return;
        if (still) draw(performance.now());
        else wake();
      });
    };

    layout();
    if (still) {
      draw(performance.now());
    } else {
      wakeRef.current = wake;
      wake();
    }

    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);
    ro.observe(section);
    lg.addEventListener("change", onResize);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else stop();
    }, { rootMargin: "120px 0px" });
    if (!still) io.observe(wrap);

    const onVisibility = () => (document.hidden ? stop() : wake());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      if (resizeQueued) cancelAnimationFrame(resizeQueued);
      wakeRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      lg.removeEventListener("change", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced, smoothed, start, range]);

  return (
    <div ref={wrapRef} className="ot-hero-visual" aria-hidden="true">
      <canvas ref={canvasRef} className="ot-hero-canvas" />
    </div>
  );
}
