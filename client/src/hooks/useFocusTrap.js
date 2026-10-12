import { useEffect, useRef } from "react";

// Hand-rolled focus trap for dialog-like surfaces (modals, the mobile nav
// drawer) -- no modal/dialog dependency exists anywhere in this app, and
// pulling one in isn't worth it for a handful of call sites. Moves focus
// into `containerRef` on open, cycles Tab/Shift+Tab within it, and closes
// on Escape.
//
// `onClose` is read through a ref: callers pass inline functions, and having
// it in the effect's dependencies re-ran the trap on every re-render, pulling
// focus back to the first control mid-interaction.
export default function useFocusTrap(containerRef, isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => !el.disabled);

    const focusables = getFocusable();
    (focusables[0] || container).focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, containerRef]);
}
