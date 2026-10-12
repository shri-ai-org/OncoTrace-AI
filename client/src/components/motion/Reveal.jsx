import { useEffect, useRef } from "react";
import { animate } from "motion/mini";
import { REDUCED_MOTION_QUERY } from "../../hooks/useMediaQuery";

/* Scroll-reveal that is safe for prerendered HTML.

   The server (and hydration) render plain, fully visible markup, so there is
   nothing to mismatch and no-JS visitors see everything. Once interactive,
   one shared IntersectionObserver checks each element exactly once:
     - already on screen, or scrolled past: left alone (never re-hidden);
     - still below the fold: marked data-reveal="pending" (hidden by CSS,
       off-screen so it is never seen disappearing), then animated in with
       Motion's WAAPI `animate` when it enters the viewport.
   Skipped entirely under prefers-reduced-motion. */

const EASE = [0.16, 1, 0.3, 1];
const state = new WeakMap();
let observer = null;

function onIntersect(entries) {
  for (const entry of entries) {
    const el = entry.target;
    const s = state.get(el);
    if (!s) continue;

    if (!s.armed) {
      s.armed = true;
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        observer.unobserve(el);
        state.delete(el);
      } else {
        el.dataset.reveal = "pending";
      }
      continue;
    }

    if (entry.isIntersecting) {
      observer.unobserve(el);
      state.delete(el);
      // Remove the CSS hide and start the animation in the same task; the
      // animation's backwards fill holds the hidden pose through its delay.
      delete el.dataset.reveal;
      animate(
        el,
        { opacity: [0, 1], transform: ["translateY(16px)", "none"] },
        { duration: 0.6, delay: s.delay, ease: EASE }
      );
    }
  }
}

function getObserver() {
  if (!observer) observer = new IntersectionObserver(onIntersect, { threshold: 0 });
  return observer;
}

export default function Reveal({ as: Tag = "div", delay = 0, className, children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    state.set(el, { armed: false, delay });
    const io = getObserver();
    io.observe(el);
    return () => {
      io.unobserve(el);
      state.delete(el);
      delete el.dataset.reveal;
    };
  }, [delay]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
