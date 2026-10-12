import { useEffect, useRef, useState } from "react";
import { Icon, LockIcon } from "../icons";
import { ICONS } from "../iconPaths";
import useFocusTrap from "../../../hooks/useFocusTrap";
import { verifyCredentials } from "../api";
import { setCredential } from "./credentialStore";

const TITLE_ID = "lb-auth-title";
const SUBTITLE_ID = "lb-auth-subtitle";

const DEFAULT_SUBTITLE =
  "The liquid biopsy analysis engine is invite-only while in preview. "
  + "Enter the credentials from your invitation to continue.";

export default function DemoLoginModal({ onSuccess, subtitle = DEFAULT_SUBTITLE, onRequestAccess }) {
  const panelRef = useRef(null);
  const passwordRef = useRef(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // The fields are disabled while a sign-in is in flight, and a disabled input
  // can't take focus -- so a failure only requests the refocus, and the effect
  // below performs it once `busy` clears and the password field is enabled.
  const refocusPasswordRef = useRef(false);

  // No onClose handler: this dialog is the gate, so Escape must not dismiss it.
  // useFocusTrap still swallows the keypress, which stops Escape reaching
  // anything behind the overlay.
  useFocusTrap(panelRef, true, undefined);

  useEffect(() => {
    if (busy || !refocusPasswordRef.current) return;
    refocusPasswordRef.current = false;
    passwordRef.current?.focus();
  }, [busy]);

  const canSubmit = username.trim() !== "" && password !== "" && !busy;

  const fail = (message) => {
    setError(message);
    setPassword("");
    refocusPasswordRef.current = true;

    // Driven imperatively rather than by a CSS class: re-running a CSS
    // animation needs either a remount (which would drop focus and the typed
    // username) or a reflow hack. This just plays it.
    const panel = panelRef.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (panel?.animate && !reduced) {
      panel.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 400, easing: "ease-in-out" },
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      const encoded = await verifyCredentials(username.trim(), password);
      if (!encoded) {
        fail("That username or password isn't right. Check the details in your invitation.");
        return;
      }
      setCredential(encoded);
      onSuccess();
    } catch (err) {
      fail(err?.message || "Something went wrong signing in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "var(--lb-bg-overlay)", backdropFilter: "blur(8px)",
        // Centred by the panel's `margin: auto`, not align/justify-content:
        // those centre an overflowing panel too, pushing its top above the
        // scroll origin where it can't be reached (landscape phones).
        display: "flex",
        padding: "16px", overflowY: "auto",
        animation: "lb-auth-overlay-in 180ms ease-out both",
      }}
    >
      <style>{`
        @keyframes lb-auth-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lb-auth-card-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .lb-auth-card { animation: lb-auth-card-in 340ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        /* The field's border is an inline style, so the focus colour needs
           !important; the halo is what makes keyboard focus clearly visible. */
        .lb-auth-field:focus {
          border-color: var(--lb-brand) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--lb-brand) 22%, transparent);
        }
        .lb-auth-icon-btn:focus-visible { outline: 2px solid var(--lb-brand); outline-offset: 1px; }
        .lb-auth-submit { transition: filter 0.15s ease, opacity 0.2s ease; }
        .lb-auth-submit:hover:not(:disabled) { filter: brightness(0.92); }
        .lb-auth-submit:active:not(:disabled) { transform: translateY(1px); }
        @media (prefers-reduced-motion: reduce) {
          .lb-auth-card { animation: none !important; }
        }
        @media (max-width: 480px) {
          .lb-auth-body { padding: 24px 20px !important; }
        }
      `}</style>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={SUBTITLE_ID}
        tabIndex={-1}
        className="lb-auth-card"
        style={{
          width: "min(420px, 100%)",
          margin: "auto",
          background: "var(--lb-bg-surface)",
          border: "1px solid var(--lb-border)",
          borderRadius: "var(--lb-radius-lg)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.28)",
          overflow: "hidden",
          fontFamily: "var(--lb-font-body)",
        }}
      >
        {/* Brand hairline */}
        <div
          aria-hidden="true"
          style={{ height: "3px", background: "linear-gradient(90deg, var(--lb-brand), #60a5fa)" }}
        />

        <div className="lb-auth-body" style={{ padding: "32px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* The ribbon logo is unreadable below ~80px, so the brand is carried
                by the wordmark instead and the badge stays a clean silhouette. */}
            <div
              aria-hidden="true"
              style={{
                width: "48px", height: "48px", borderRadius: "var(--lb-radius-md)",
                background: "linear-gradient(135deg, var(--lb-brand), #3b82f6)",
                color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.28)",
              }}
            >
              <LockIcon size={22} />
            </div>

            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--lb-font-display)",
                fontSize: "var(--lb-text-base)", fontWeight: 700,
                letterSpacing: "-0.01em", color: "var(--lb-text-primary)",
              }}
            >
              OncoTrace<span style={{ color: "var(--lb-brand)" }}>-AI</span>
            </p>

            <h2
              id={TITLE_ID}
              style={{
                fontFamily: "var(--lb-font-display)", fontSize: "var(--lb-text-lg)",
                fontWeight: 700, color: "var(--lb-text-primary)", margin: "18px 0 0",
              }}
            >
              Private demo access
            </h2>

            <p
              id={SUBTITLE_ID}
              style={{
                fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)",
                lineHeight: 1.6, margin: "8px 0 0",
              }}
            >
              {subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: "26px" }} noValidate>
            <Field
              id="lb-auth-username"
              label="Username"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              autoFocus
              disabled={busy}
              invalid={!!error}
            />

            <div style={{ marginTop: "14px", position: "relative" }}>
              <Field
                id="lb-auth-password"
                ref={passwordRef}
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                disabled={busy}
                invalid={!!error}
                paddingRight="44px"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="lb-auth-icon-btn"
                style={{
                  position: "absolute", right: "8px", bottom: "6px",
                  width: "32px", height: "32px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: showPassword ? "var(--lb-brand)" : "var(--lb-text-muted)",
                  borderRadius: "var(--lb-radius-sm)",
                }}
              >
                <Icon d={ICONS.eye} size={15} />
              </button>
            </div>

            <div role="alert" aria-live="assertive">
              {error && (
                <div
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    marginTop: "14px", padding: "10px 12px",
                    background: "var(--lb-status-high-bg)",
                    border: "1px solid var(--lb-status-high-border)",
                    borderRadius: "var(--lb-radius-sm)",
                    color: "var(--lb-status-high)",
                    fontSize: "var(--lb-text-sm)", lineHeight: 1.5,
                  }}
                >
                  <Icon d={ICONS.alert} size={14} style={{ marginTop: "2px" }} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              data-lb-btn="primary"
              className="lb-auth-submit"
              style={{
                width: "100%", height: "44px", marginTop: "20px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: "var(--lb-brand)",
                color: "#ffffff", border: "none",
                borderRadius: "var(--lb-radius-md)",
                fontFamily: "var(--lb-font-body)",
                fontSize: "var(--lb-text-base)", fontWeight: 700,
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.6,
              }}
            >
              {busy ? (
                <>
                  <Icon d={ICONS.spinner} size={15} style={{ animation: "lb-spin 0.8s linear infinite" }} />
                  Verifying…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p
            style={{
              marginTop: "18px", textAlign: "center",
              fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)", lineHeight: 1.6,
            }}
          >
            You'll be asked to sign in again on every refresh. Nothing is saved to this device.
          </p>

          {onRequestAccess && (
            <p
              style={{
                marginTop: "10px", textAlign: "center",
                fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)", lineHeight: 1.6,
              }}
            >
              If you don't have access —{" "}
              <button
                type="button"
                onClick={onRequestAccess}
                style={{
                  background: "none", border: "none", padding: 0, margin: 0,
                  font: "inherit", fontWeight: 600, color: "var(--lb-brand)",
                  cursor: "pointer", textDecoration: "underline",
                  textUnderlineOffset: "3px", textDecorationColor: "transparent",
                  transition: "text-decoration-color 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = "currentColor"; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = "transparent"; }}
              >
                Request demo access
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, value, onChange, type = "text", autoComplete, autoFocus,
  disabled, invalid, paddingRight, ref,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block", marginBottom: "6px",
          fontSize: "var(--lb-text-xs)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--lb-text-muted)",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className="lb-auth-field"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="none"
        style={{
          width: "100%", height: "44px",
          padding: `0 ${paddingRight || "12px"} 0 12px`,
          background: "var(--lb-input-bg)",
          border: `1px solid ${invalid ? "var(--lb-status-high)" : "var(--lb-border-strong)"}`,
          borderRadius: "var(--lb-radius-md)",
          color: "var(--lb-text-primary)",
          fontFamily: "var(--lb-font-body)",
          // 16px keeps iOS Safari from zooming the viewport on focus.
          fontSize: "16px",
          outline: "none",
          transition: "border-color 0.2s ease",
        }}
      />
    </div>
  );
}
