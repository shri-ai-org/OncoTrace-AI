// Icon components for the whole feature — merges what used to be Dashboard.jsx's
// `Icon` renderer and File.jsx's standalone icon components. Path data lives in
// ./iconPaths.js, kept separate so this file only exports components (React Fast
// Refresh requires that of any file exporting a component).

// aria-hidden + focusable="false": every call site pairs this with either
// visible text or an aria-label on the enclosing button, so the icon itself
// is decorative -- exposing it to the accessibility tree would just announce
// an unlabeled graphic ahead of the label that already names it.
export const Icon = ({ d, size = 16, style = {}, strokeWidth = 1.5 }) => (
  <svg
    style={{ width: size, height: size, flexShrink: 0, ...style }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={d} />
  </svg>
);

// Not reducible to a single `d` path (rect + path) — kept as its own component.
export const LockIcon = ({ size = 16, style = {} }) => (
  <svg
    style={{ width: size, height: size, flexShrink: 0, ...style }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
