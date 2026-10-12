// Decorative header artwork for the upload page -- hand-drawn inline SVG so it
// needs no external image asset, stays crisp at any size, and can pick up the
// page's CSS custom properties for light/dark theming.
export function HeroIllustration({ size = 220, style = {} }) {
  return (
    <svg
      viewBox="0 0 220 220"
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lb-tube-liquid" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
        <linearGradient id="lb-helix-strand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--lb-brand)" />
          <stop offset="100%" stopColor="var(--lb-status-info)" />
        </linearGradient>
      </defs>

      {/* soft backdrop halo */}
      <circle cx="110" cy="112" r="98" fill="var(--lb-status-info-bg)" />

      {/* blood-draw tube */}
      <g transform="translate(58,38)">
        <path d="M4 0h30a4 4 0 014 4v6H0V4a4 4 0 014-4z" fill="var(--lb-border-strong)" />
        <rect x="0" y="10" width="38" height="110" rx="14" fill="var(--lb-bg-surface-raised)" stroke="var(--lb-border-strong)" strokeWidth="2.5" />
        <path d="M2.5 68a16 16 0 0033 0v38a16.5 16.5 0 01-33 0z" fill="url(#lb-tube-liquid)" />
        <circle cx="12" cy="86" r="2.6" fill="#fecdd3" opacity="0.85" />
        <circle cx="24" cy="100" r="1.8" fill="#fecdd3" opacity="0.7" />
      </g>

      {/* DNA helix rising from the tube */}
      <g transform="translate(93,14)" stroke="url(#lb-helix-strand)" strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M0 4C13 14 -13 26 0 36C13 46 -13 58 0 68" />
        <path d="M0 4C-13 14 13 26 0 36C-13 46 13 58 0 68" />
        <path d="M-8 10h16M-8 22h16M-8 34h16M-8 46h16M-8 58h16" strokeWidth="2" opacity="0.6" />
      </g>

      {/* floating report card */}
      <g transform="translate(122,118)">
        <rect x="0" y="0" width="62" height="72" rx="8" fill="var(--lb-bg-surface-raised)" stroke="var(--lb-border-strong)" strokeWidth="2" />
        <rect x="10" y="12" width="30" height="5" rx="2.5" fill="var(--lb-text-muted)" opacity="0.5" />
        <rect x="10" y="24" width="42" height="4" rx="2" fill="var(--lb-border)" />
        <rect x="10" y="33" width="42" height="4" rx="2" fill="var(--lb-border)" />
        <g transform="translate(10,44)">
          <rect x="0" y="14" width="6" height="10" rx="1.5" fill="var(--lb-status-info)" />
          <rect x="9" y="8" width="6" height="16" rx="1.5" fill="var(--lb-status-info)" />
          <rect x="18" y="2" width="6" height="22" rx="1.5" fill="var(--lb-brand)" />
          <rect x="27" y="10" width="6" height="14" rx="1.5" fill="var(--lb-status-info)" />
        </g>
        <circle cx="52" cy="14" r="7" fill="var(--lb-status-low-bg)" stroke="var(--lb-status-low)" strokeWidth="1.6" />
        <path d="M49 14l2 2 4-4" stroke="var(--lb-status-low)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* small drop accents */}
      <circle cx="52" cy="150" r="4" fill="var(--lb-status-info)" opacity="0.5" />
      <circle cx="168" cy="70" r="3" fill="var(--lb-brand)" opacity="0.4" />
    </svg>
  );
}

// Document-with-folded-corner thumbnail used on the sample-file cards --
// a small preview glyph rather than a generic file outline, so each card
// reads as "a real file" at a glance.
export function FileThumbnail({ size = 44, style = {} }) {
  return (
    <svg
      viewBox="0 0 44 44"
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 3h16l8 8v27a3 3 0 01-3 3H10a3 3 0 01-3-3V6a3 3 0 013-3z"
        fill="var(--lb-bg-surface-raised)"
        stroke="var(--lb-status-info-border)"
        strokeWidth="1.5"
      />
      <path d="M26 3v6a2 2 0 002 2h6z" fill="var(--lb-status-info-bg)" stroke="var(--lb-status-info-border)" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="12" y="20" width="16" height="2.4" rx="1.2" fill="var(--lb-status-info)" opacity="0.85" />
      <rect x="12" y="25.5" width="20" height="2.4" rx="1.2" fill="var(--lb-border)" />
      <rect x="12" y="31" width="13" height="2.4" rx="1.2" fill="var(--lb-border)" />
    </svg>
  );
}
