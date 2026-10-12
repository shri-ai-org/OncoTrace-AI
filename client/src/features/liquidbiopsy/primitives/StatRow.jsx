export default function StatRow({ label, value, highlight, ideal, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      padding: "9px 10px", borderRadius: "var(--lb-radius-md)", marginBottom: "3px",
      background: highlight ? "var(--lb-status-info-bg)" : "transparent",
      border: highlight ? "1px solid var(--lb-status-info-border)" : "1px solid transparent",
    }}>
      <div>
        <span style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)" }}>{label}</span>
        {ideal && <div style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "2px" }}>Ideal: {ideal}</div>}
      </div>
      <span style={{
        fontSize: "var(--lb-text-sm)", fontWeight: 700,
        color: color || (highlight ? "var(--lb-status-info)" : "var(--lb-text-primary)"),
        flexShrink: 0, marginLeft: "8px",
      }}>
        {value ?? "—"}
      </span>
    </div>
  );
}
