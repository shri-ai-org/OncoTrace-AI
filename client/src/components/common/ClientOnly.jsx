import useHydrated from "../../hooks/useHydrated";

/**
 * Renders `fallback` on the server and during hydration, `children` after.
 * Used for the lazily-loaded sample report: rendering the lazy component
 * during hydration would make React discard the server HTML for that
 * boundary (error #419, logged even in production).
 */
export default function ClientOnly({ children, fallback = null }) {
  return useHydrated() ? children : fallback;
}
