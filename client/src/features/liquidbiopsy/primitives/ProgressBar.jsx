export default function ProgressBar({ value, max = 100, color = "var(--lb-status-info)", height = 5, showIdeal, idealRange }) {
  return (
    <div>
      <div style={{ width: "100%", height: `${height}px`, background: "var(--lb-track)", borderRadius: "var(--lb-radius-full)", overflow: "hidden", position: "relative" }}>
        <div style={{
          height: "100%", width: `${Math.min((value / max) * 100, 100)}%`,
          background: color, borderRadius: "var(--lb-radius-full)", transition: "width 0.8s ease",
        }} />
        {showIdeal && idealRange && (
          <>
            <div style={{ position: "absolute", top: 0, left: `${idealRange[0]}%`, width: "1px", height: "100%", background: "rgba(255,255,255,0.5)" }} />
            <div style={{ position: "absolute", top: 0, left: `${idealRange[1]}%`, width: "1px", height: "100%", background: "rgba(255,255,255,0.5)" }} />
          </>
        )}
      </div>
      {showIdeal && idealRange && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
          <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>0</span>
          <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-status-low)" }}>Ideal range</span>
          <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>100</span>
        </div>
      )}
    </div>
  );
}
