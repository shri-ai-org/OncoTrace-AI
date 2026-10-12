import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Migrated from a hand-rolled SVG donut to recharts — gains a real hover tooltip,
// which the old version never had.
export default function DonutChart({ data, size = 130, label, sublabel }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={size * 0.36}
            outerRadius={size / 2 - 2}
            paddingAngle={1.5}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--lb-bg-surface)",
              border: "1px solid var(--lb-border)",
              borderRadius: "var(--lb-radius-sm)",
              fontSize: "11px",
              color: "var(--lb-text-primary)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(label || sublabel) && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none",
        }}>
          {label && <span style={{ fontSize: "15px", fontWeight: 900, color: "var(--lb-text-primary)" }}>{label}</span>}
          {sublabel && <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--lb-text-muted)", marginTop: "2px" }}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
