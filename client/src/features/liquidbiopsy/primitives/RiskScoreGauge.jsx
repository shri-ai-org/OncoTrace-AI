// Semicircular "risk meter" -- LOW / AVERAGE / HIGH bands with a needle
// pointing at the disclosed composite score. Purely a rendering of the
// already-computed score + band passed in by the caller; this component
// invents no numbers of its own.

const BANDS = [
  { key: "low", range: [0, 34], color: "var(--lb-status-low)", label: "LOW" },
  { key: "moderate", range: [34, 67], color: "var(--lb-status-moderate)", label: "AVERAGE" },
  { key: "high", range: [67, 100], color: "var(--lb-status-high)", label: "HIGH" },
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// score 0 -> 180deg (far left), score 100 -> 0deg (far right)
function scoreToAngle(score) {
  return 180 - (Math.max(0, Math.min(100, score)) / 100) * 180;
}

function arcPath(cx, cy, r, startScore, endScore) {
  const start = polarToCartesian(cx, cy, r, scoreToAngle(startScore));
  const end = polarToCartesian(cx, cy, r, scoreToAngle(endScore));
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

export default function RiskScoreGauge({ score, color }) {
  const cx = 110;
  const cy = 104;
  const r = 84;
  const strokeW = 20;
  const clamped = Math.max(0, Math.min(100, score));
  const needleAngle = scoreToAngle(clamped);
  const needleLen = r - strokeW / 2 - 4;
  const needleEnd = polarToCartesian(cx, cy, needleLen, needleAngle);

  return (
    <svg viewBox="0 0 220 128" style={{ width: "100%", maxWidth: "260px", display: "block" }}>
      {BANDS.map((b) => (
        <path
          key={b.key}
          d={arcPath(cx, cy, r, b.range[0], b.range[1])}
          fill="none"
          stroke={b.color}
          strokeWidth={strokeW}
          opacity={0.85}
        />
      ))}

      <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="var(--lb-text-primary)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6.5} fill="var(--lb-text-primary)" />

      <text x={cx - r - 2} y={cy + 22} fontSize="9.5" fontWeight="800" fill="var(--lb-status-low)" textAnchor="start">LOW</text>
      <text x={cx} y={cy - r - 10} fontSize="9.5" fontWeight="800" fill="var(--lb-status-moderate)" textAnchor="middle">AVERAGE</text>
      <text x={cx + r + 2} y={cy + 22} fontSize="9.5" fontWeight="800" fill="var(--lb-status-high)" textAnchor="end">HIGH</text>

      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="34" fontWeight="900" fill={color}>
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
