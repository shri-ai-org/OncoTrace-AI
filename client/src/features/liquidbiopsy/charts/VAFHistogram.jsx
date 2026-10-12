import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

export default function VAFHistogram({ data }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--lb-border)" vertical={false} />
          <XAxis dataKey="range" tick={{ fontSize: 9, fill: "var(--lb-text-muted)" }} axisLine={{ stroke: "var(--lb-border)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--lb-text-muted)" }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            cursor={{ fill: "var(--lb-row-hover)" }}
            contentStyle={{ background: "var(--lb-bg-surface)", border: "1px solid var(--lb-border)", borderRadius: "var(--lb-radius-sm)", fontSize: "11px", color: "var(--lb-text-primary)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="count" position="top" style={{ fontSize: "10px", fontWeight: 700, fill: "var(--lb-text-secondary)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", textAlign: "center", marginTop: "4px" }}>
        Heterozygous germline variants typically cluster around 50% VAF
      </p>
    </div>
  );
}
