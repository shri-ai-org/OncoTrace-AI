export default function SectionHeader({ title, accent = "var(--lb-brand)", right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: accent, flexShrink: 0 }} />
        <span style={{
          fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase",
          letterSpacing: "0.12em", color: "var(--lb-text-muted)",
        }}>
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}
