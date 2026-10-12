// Gates the liquid biopsy demo behind the shared invite credential.
//
// This component is UX, not security. Anyone can flip its state in React
// DevTools or skip the UI and call the API directly -- the only real
// enforcement is the Basic-auth check the server applies to
// POST /api/v1/vcf/analyze. This exists so invited users get a way in, and
// everyone else gets a closed door instead of a confusing upload failure.

import { useEffect, useState } from "react";
import DemoLoginModal from "./DemoLoginModal";
import { getCredential, AUTH_EXPIRED_EVENT } from "./credentialStore";
import { isMockMode } from "../api";
import "../tokens.css";

if (isMockMode && typeof console !== "undefined") {
  console.warn(
    "[liquidbiopsy] DEMO MODE: the login gate is bypassed. There is no backend to "
    + "authenticate against and the mock data is a fixed fixture.",
  );
}

export default function DemoAuthGate({ children, subtitle, onRequestAccess }) {
  // The credential is memory-only, so this is false on every fresh page load --
  // a refresh always re-prompts. It is read rather than hardcoded to false so
  // the gate stays correct if it ever remounts mid-session.
  const [authed, setAuthed] = useState(() => !!getCredential());

  useEffect(() => {
    // api.js clears the credential and fires this when the server rejects it
    // mid-session (rotated password, or a restart with new config).
    const handleExpired = () => setAuthed(false);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  // Mock mode has no backend, so /api/v1/auth/verify would 404 and the modal
  // could never be satisfied -- it would hard-lock local development against a
  // fixed fixture that protects nothing.
  if (isMockMode) return children;

  if (authed) return children;

  // LiquidBiopsyDemo owns the [data-lb-theme] wrapper that resolves every
  // --lb-* token, and it is not mounted yet. Without this wrapper the modal
  // would render with no tokens at all. "light" matches the demo's own default
  // (LiquidBiopsyDemo.jsx), so unlocking doesn't flash a theme change.
  // The demo isn't mounted behind the modal, so the gate paints its own
  // background -- otherwise the locked state reads as a broken blank page.
  return (
    <div
      data-lb-theme="light"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(37, 99, 235, 0.10), transparent 70%),"
          + "radial-gradient(ellipse 50% 50% at 85% 100%, rgba(6, 182, 212, 0.10), transparent 70%),"
          + "var(--lb-bg-page)",
      }}
    >
      <DemoLoginModal onSuccess={() => setAuthed(true)} subtitle={subtitle} onRequestAccess={onRequestAccess} />
    </div>
  );
}
