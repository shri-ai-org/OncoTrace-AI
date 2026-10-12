import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe media query. Reports false on the server and while hydrating
 * (matching the prerendered HTML), then the real value; live-updates.
 */
export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
