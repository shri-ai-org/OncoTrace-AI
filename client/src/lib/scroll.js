import { afterHomeLayout } from "./layout";

/* Smooth-scroll to a home-page section, landing just below the fixed navbar
   (its height is the responsive --nav-h CSS variable). Sections below the
   lazily-loaded sample report move once it mounts, so the target is measured
   only after that (bounded wait; immediate once ready; corrected if the
   report mounts after the wait gave up, see afterHomeLayout). */
/* "smooth", or "instant" for visitors who ask for reduced motion. An explicit
   behavior overrides the CSS opt-out (navbar.css), so every programmatic
   scroll on the site goes through this. */
export function scrollBehavior() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}

export function navOffset() {
  const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"));
  return (Number.isFinite(h) ? h : 80) + 8;
}

export function scrollToSection(id) {
  if (!id || id === "home") {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    return;
  }
  afterHomeLayout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - navOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
  });
}
