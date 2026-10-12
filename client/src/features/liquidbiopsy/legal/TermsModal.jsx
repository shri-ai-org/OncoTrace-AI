import { useEffect, useRef } from "react";
import { Icon } from "../icons";
import { ICONS } from "../iconPaths";
import useFocusTrap from "../../../hooks/useFocusTrap";
import { TERMS_SECTIONS } from "./termsContent";

export default function TermsModal({ open, onClose, triggerRef }) {
  const panelRef = useRef(null);

  useFocusTrap(panelRef, open, () => {
    onClose();
    triggerRef?.current?.focus();
  });

  // Locks the page behind the dialog, so wheel/touch/arrow-key scrolling can't
  // move it instead of the terms text. Same approach as the site Navbar's
  // drawer, including the scrollbar-width padding that stops a layout shift.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={() => { onClose(); triggerRef?.current?.focus(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "var(--lb-bg-overlay)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-terms-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)", maxHeight: "min(80vh, 640px)", display: "flex", flexDirection: "column",
          background: "var(--lb-bg-surface)", border: "1px solid var(--lb-border)", borderRadius: "var(--lb-radius-lg)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: "1px solid var(--lb-border)", flexShrink: 0,
        }}>
          <h2 id="lb-terms-title" style={{ fontSize: "var(--lb-text-md)", fontWeight: 700, color: "var(--lb-text-primary)" }}>
            Terms &amp; Data Use
          </h2>
          <button
            onClick={() => { onClose(); triggerRef?.current?.focus(); }}
            aria-label="Close terms and data use dialog"
            data-lb-btn="utility"
            style={{
              width: "32px", height: "32px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border)", background: "var(--lb-input-bg)",
              color: "var(--lb-text-secondary)", cursor: "pointer",
            }}
          >
            <Icon d={ICONS.close} size={14} />
          </button>
        </div>

        {/* Focusable so keyboard users can scroll it with the arrow keys (it
            is also then part of the dialog's Tab cycle). */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Terms and data use text"
          style={{ padding: "20px", overflowY: "auto", overscrollBehavior: "contain" }}
        >
          {TERMS_SECTIONS.map((section) => (
            <div key={section.id} style={{ marginBottom: "18px" }}>
              <p style={{
                fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase",
                letterSpacing: "0.12em", color: "var(--lb-text-muted)", marginBottom: "6px",
              }}>
                {section.title}
              </p>
              <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)", lineHeight: 1.7 }}>
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
