import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { tierColor } from "../colors";

// Colors each point by its tier rather than a single flat line color, so the
// trend itself carries the same tier signal used everywhere else in the app.
function TierDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={3} fill={tierColor(payload.tier)} stroke="none" />;
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      background: "var(--lb-bg-surface)", border: "1px solid var(--lb-border)", borderRadius: "var(--lb-radius-sm)",
      padding: "8px 10px", fontSize: "11px", color: "var(--lb-text-primary)", lineHeight: 1.5,
    }}>
      <div style={{ fontWeight: 700 }}>{p.gene}</div>
      <div style={{ color: "var(--lb-text-muted)" }}>chr{p.chrom}:{Number(p.pos).toLocaleString()}</div>
      <div>{p.vafPct.toFixed(1)}% of DNA fragments</div>
    </div>
  );
}

// Real per-variant VAF plotted in genomic order (data must already be sorted by
// chrom/pos by the caller) -- not a fabricated trend, just the file's own values
// laid out so a reader can see where high-fraction findings cluster.
export default function VAFTrendLine({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--lb-border)" vertical={false} />
        <XAxis dataKey="index" tick={false} axisLine={{ stroke: "var(--lb-border)" }} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10, fill: "var(--lb-text-muted)" }}
          axisLine={false} tickLine={false} width={44}
        />
        <ReferenceLine y={30} stroke="var(--lb-status-moderate)" strokeDasharray="4 4" strokeOpacity={0.6} />
        <ReferenceLine y={5} stroke="var(--lb-status-low)" strokeDasharray="4 4" strokeOpacity={0.6} />
        <Tooltip content={<TrendTooltip />} />
        <Line type="monotone" dataKey="vafPct" stroke="var(--lb-status-info)" strokeWidth={1.5} dot={<TierDot />} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
