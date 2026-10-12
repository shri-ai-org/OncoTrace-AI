/* Layout constants and signals shared across pages. */

/* Navbar height token. Navbar.jsx defines --nav-h responsively (it shrinks on
   small screens) and scrolls/offsets against it; page content below must
   offset by the same var so the fixed header never overlaps it. */
export const NAV_H = "var(--nav-h, 108px)";

/* DNA3DSection's own scroll-driven height. Lives here (not in that file) so the
   home page can reserve exactly this much space while the lazily-loaded three.js
   chunk downloads, without statically importing the chunk it is waiting for. */
export const DNA3D_HEIGHT_CLASS = "h-[260vh] sm:h-[320vh] lg:h-[340vh]";

/* Home-page layout readiness.

   The sample report is lazy-loaded and its height depends on its content, so
   every section below it moves once it mounts. A scroll computed before that
   (a ?section= deep link, or a navbar click in the first moments after load)
   would land on a stale position. Section scrolls wait on this instead.

   Resolves once per page load; afterwards the chunk is cached and re-mounts
   synchronously, so the promise staying resolved is correct. */
let markReady;
let layoutReady = false;
const homeLayoutReady = new Promise((resolve) => {
  markReady = resolve;
});

export function markHomeLayoutReady() {
  layoutReady = true;
  markReady();
}

/* Bounded wait: a slow or failed chunk must never block navigation. */
export function whenHomeLayoutReady(timeoutMs = 2500) {
  return Promise.race([
    homeLayoutReady,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

// Input that means the visitor has taken over the scrolling.
const USER_SCROLL_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"];

/* Runs a section jump (`jump`) once the layout is ready, in the next frame.
   If the bounded wait gave up first (the sample report's code was slow to
   arrive, as on a slow phone connection), the report still mounts later and
   pushes everything below it down, leaving the visitor thousands of pixels
   from where they asked to go; a long smooth scroll still running then is
   not corrected by the browser's scroll anchoring. So the jump runs once
   more when the layout does settle, unless the visitor has scrolled, tapped
   or typed since. Returns a function that cancels both runs. */
export function afterHomeLayout(jump) {
  let cancelled = false;
  let tookOver = false;
  const onInput = () => { tookOver = true; };
  const run = () => requestAnimationFrame(() => { if (!cancelled) jump(); });

  whenHomeLayoutReady().then(() => {
    if (cancelled) return;
    run();
    if (layoutReady) return;
    for (const type of USER_SCROLL_INPUT) window.addEventListener(type, onInput, { capture: true, passive: true });
    // Give up after a while: a chunk that never arrives must not leave
    // listeners behind or move the page much later.
    Promise.race([homeLayoutReady, new Promise((resolve) => setTimeout(resolve, 15000))]).then(() => {
      for (const type of USER_SCROLL_INPUT) window.removeEventListener(type, onInput, { capture: true });
      if (layoutReady && !cancelled && !tookOver) run();
    });
  });
  return () => { cancelled = true; };
}

/* Hero "hold" (Hero `hold` prop). For one screen-height of scrolling, the
   hero glides up at 30% of the scroll speed while its visual plays out, and
   the content below catches up with it right as the hold ends. The spacer
   after the hero (.ot-hero-hold-space, 70% of a screen) is the distance the
   hero falls behind; HERO_HOLD_TRAVEL must match its share of the hold in
   Hero.css (70 of 100 * --vh). */
export const HERO_HOLD_TRAVEL = 0.7;

/** { start, distance, travel } in px for a held hero section, else null. */
export function heroHold(section) {
  const wrap = section?.parentElement;
  const space = wrap?.classList.contains("ot-hero-hold") ? wrap.querySelector(":scope > .ot-hero-hold-space") : null;
  const travel = space?.offsetHeight || 0;
  if (!travel) return null;
  // Starts once the whole hero is on screen (heroes taller than a short
  // phone's screen first scroll normally until their bottom is in view).
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  return { start: Math.max(0, top + section.offsetHeight - window.innerHeight), distance: travel / HERO_HOLD_TRAVEL, travel };
}
