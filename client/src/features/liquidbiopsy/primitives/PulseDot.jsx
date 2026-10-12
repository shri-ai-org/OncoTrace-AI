export default function PulseDot({ color = "var(--lb-status-low)" }) {
  return (
    <span style={{
      display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
      background: color, animation: "lb-pulse 2s infinite",
    }} />
  );
}
