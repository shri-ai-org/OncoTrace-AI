import { useEffect, useRef, useState } from "react";

/**
 * One-shot visibility trigger for scroll-reveal animations.
 *
 *   const [ref, inView] = useInView({ threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
 *
 * `inView` flips to true the first time the element intersects and then stays
 * true (the observer disconnects), so content never re-hides on scroll-back.
 * Options are primitives rather than an object so callers can pass a fresh
 * literal on every render without re-subscribing the observer.
 *
 * Starts false on the server and the client alike, so prerendered HTML
 * hydrates without a mismatch. Never use this to hide server-rendered
 * content: use <Reveal> (components/motion) for scroll-in effects.
 */
export default function useInView({ threshold = 0.1, rootMargin = "0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}
