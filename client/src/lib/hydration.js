/* Set by main.jsx when it hydrates prerendered HTML (only "/"). Lets mount
   effects skip work that would fight a visitor who already interacted with
   the server HTML, e.g. HomePage's scroll-to-top on first mount. */
let hydrating = false;

export function markHydrating() {
  hydrating = true;
}

export function wasHydrated() {
  return hydrating;
}
