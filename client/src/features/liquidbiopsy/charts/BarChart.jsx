import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Migrated from a hand-rolled <canvas> chart (was `CanvasBarChart`) to recharts.
// Gains a real hover tooltip and correct redraw-on-resize for free — the old
// canvas version only redrew when `data`/`isDark` changed, never on window resize.
export default function BarChart({ data, height = 180, xKey = "chr", yKey = "count", colorKey, fill = "var(--lb-status-info)" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--lb-border)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 9, fill: "var(--lb-text-muted)" }} axisLine={{ stroke: "var(--lb-border)" }} tickLine={false} interval={0} angle={data.length > 12 ? -45 : 0} textAnchor={data.length > 12 ? "end" : "middle"} height={data.length > 12 ? 32 : 20} />
        <YAxis tick={{ fontSize: 10, fill: "var(--lb-text-muted)" }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          cursor={{ fill: "var(--lb-row-hover)" }}
          contentStyle={{ background: "var(--lb-bg-surface)", border: "1px solid var(--lb-border)", borderRadius: "var(--lb-radius-sm)", fontSize: "11px", color: "var(--lb-text-primary)" }}
        />
        <Bar dataKey={yKey} radius={[3, 3, 0, 0]} fill={fill} isAnimationActive={false}>
          {colorKey && data.map((d, i) => <Cell key={i} fill={d[colorKey]} />)}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
