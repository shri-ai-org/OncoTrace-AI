export default function Card({ children, style = {}, onClick, className = "" }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--lb-bg-surface)",
        border: "1px solid var(--lb-border)",
        borderRadius: "var(--lb-radius-lg)",
        boxShadow: "var(--lb-card-shadow)",
        overflow: "hidden",
        transition: "all 0.3s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
