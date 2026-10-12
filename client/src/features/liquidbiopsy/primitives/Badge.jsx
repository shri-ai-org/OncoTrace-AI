export default function Badge({ label, color = "var(--lb-status-neutral)", small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: small ? "2px 7px" : "3px 9px",
      borderRadius: "var(--lb-radius-sm)",
      fontSize: small ? "var(--lb-text-2xs)" : "var(--lb-text-xs)",
      fontWeight: 700,
      background: `color-mix(in srgb, ${color} 16%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      color,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
