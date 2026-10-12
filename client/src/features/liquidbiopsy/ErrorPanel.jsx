import { useEffect, useRef } from "react";
import ThemeToggle from "./ThemeToggle";
import { Icon } from "./icons";
import { ICONS } from "./iconPaths";

const COPY = {
  malformed_vcf: {
    title: "Couldn't read this file",
    fallback: "This file couldn't be parsed as a VCF — check that it includes a valid ##fileformat header line.",
    primaryAction: "startOver",
  },
  network: {
    title: "Can't reach the analysis service",
    fallback: "The analysis service didn't respond — it may be temporarily unavailable. Please try again in a moment.",
    primaryAction: "retry",
  },
  annotation_failure: {
    title: "Analysis pipeline failed",
    fallback: "Your file parsed correctly, but the annotation step failed on our side — this isn't something wrong with your file.",
    primaryAction: "retry",
  },
  timeout: {
    title: "Analysis timed out",
    fallback: "This took longer than expected. Try again, or try a smaller file.",
    primaryAction: "retry",
  },
  unauthorized: {
    title: "Session expired",
    fallback:
      "Your demo credentials are no longer accepted — they may have been rotated. "
      + "Sign in again to continue.",
    primaryAction: "startOver",
  },
  reference_build_unresolved: {
    title: "Reference build needed",
    fallback:
      "This file doesn't state which reference genome it was aligned to, and we won't guess — the wrong build "
      + "would invalidate the annotation. Start over and select the build.",
    primaryAction: "startOver",
  },
  reference_build_mismatch: {
    title: "Reference build doesn't match",
    fallback:
      "This file's reference bases don't match the selected genome build, so it was probably aligned to the "
      + "other one. Start over and select the build it was aligned to.",
    primaryAction: "startOver",
  },
};

export default function ErrorPanel({ kind, message, theme, toggleTheme, onRetry, onStartOver, onBack }) {
  const copy = COPY[kind] || { title: "Something went wrong", fallback: "Please try again.", primaryAction: "startOver" };
  const headingRef = useRef(null);

  // This panel replaces the screen that held focus, which would otherwise drop
  // it to <body> with nothing announced. Focusing the heading reads the title,
  // and aria-describedby adds the message -- no live region, so it's said once.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--lb-bg-page)", fontFamily: "var(--lb-font-body)", display: "flex", flexDirection: "column" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--lb-bg-surface-raised)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid var(--lb-border)",
      }}>
        <div style={{ maxWidth: "1024px", margin: "0 auto", padding: "0 20px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {onBack && (
              <button onClick={onBack} title="Back to site" aria-label="Back to site" data-lb-btn="utility" style={{
                width: "32px", height: "32px", borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border)",
                background: "var(--lb-input-bg)", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}>
                <Icon d={ICONS.back} size={16} style={{ color: "var(--lb-text-secondary)" }} />
              </button>
            )}
            <div style={{ width: "28px", height: "28px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/ribbon-logo.webp" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
            </div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--lb-text-primary)" }}>OncoTrace-AI</p>
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "var(--lb-radius-md)", margin: "0 auto 20px",
            background: "var(--lb-status-high-bg)", border: "1px solid var(--lb-status-high-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon d={ICONS.alert} size={26} style={{ color: "var(--lb-status-high)" }} />
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            aria-describedby="lb-error-message"
            style={{ fontSize: "var(--lb-text-lg)", fontWeight: 700, color: "var(--lb-text-primary)", marginBottom: "10px" }}
          >
            {copy.title}
          </h1>
          <p id="lb-error-message" style={{ fontSize: "13px", color: "var(--lb-text-secondary)", lineHeight: 1.6, marginBottom: "28px" }}>
            {message || copy.fallback}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            {copy.primaryAction === "retry" && onRetry && (
              <button onClick={onRetry} data-lb-btn="primary" style={{
                padding: "10px 20px", borderRadius: "var(--lb-radius-md)", border: "1px solid transparent",
                background: "var(--lb-brand)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              }}>
                Retry
              </button>
            )}
            <button onClick={onStartOver} data-lb-btn="secondary" style={{
              padding: "10px 20px", borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border-strong)",
              background: "var(--lb-bg-surface)", color: "var(--lb-text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>
              {copy.primaryAction === "retry" ? "Start Over" : "Try a Different File"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
