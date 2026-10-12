import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false on the server AND during hydration of prerendered HTML, true after.
 * Lets client-only UI (lazy sections, portals) render the exact same markup
 * as the server first, then switch on, with no hydration mismatch.
 */
export default function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
