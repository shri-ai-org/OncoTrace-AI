import { useEffect, useRef } from "react";

// Kept hand-rolled (recharts' vertical bar layout needs more custom tick handling
// than this already gets right for 30+ categorical rows). Colors are read live
// from the CSS custom properties on the canvas element's computed style, since a
// <canvas> 2D context can't resolve var(...) itself the way SVG/DOM styling can.
function cssVar(el, name, fallback) {
  if (!el) return fallback;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

// The canvas is sized to the data (ROW_H per gene) instead of a fixed minimum
// height that the rows were stretched to fill -- that made a single gene's bar
// ~140px thick. Top padding leaves room for the "50%" label above the bars.
const PAD = { top: 18, right: 60, bottom: 8, left: 80 };
const ROW_H = 24;
const MAX_BAR_H = 14;
const MIN_HEIGHT = 72;

export default function VAFGeneChart({ data, theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = rect.width, H = rect.height;
      const cW = W - PAD.left - PAD.right;
      const rowH = Math.max(14, (H - PAD.top - PAD.bottom) / data.length);
      const bH = Math.min(rowH * 0.5, MAX_BAR_H);

      const textMuted = cssVar(canvas, "--lb-text-muted", "#94a3b8");
      const textSecondary = cssVar(canvas, "--lb-text-secondary", "#64748b");
      const border = cssVar(canvas, "--lb-border", "rgba(148,163,184,0.15)");
      const low = cssVar(canvas, "--lb-status-low", "#34d399");
      const moderate = cssVar(canvas, "--lb-status-moderate", "#f0b429");
      const high = cssVar(canvas, "--lb-status-high", "#f56565");

      ctx.clearRect(0, 0, W, H);

      const thX = PAD.left + 0.5 * cW;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(thX, PAD.top);
      ctx.lineTo(thX, H - PAD.bottom);
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = textMuted;
      ctx.font = "8px 'Plus Jakarta Sans',sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("50%", thX, PAD.top - 6);

      data.forEach((d, i) => {
        const y = PAD.top + i * rowH + (rowH - bH) / 2;
        const bW = Math.max(d.max_vaf * cW, 1);
        const color = d.max_vaf >= 0.5 ? high : d.max_vaf >= 0.2 ? moderate : low;
        ctx.beginPath();
        ctx.roundRect(PAD.left, y, bW, bH, 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = textSecondary;
        ctx.font = "9px 'Plus Jakarta Sans',sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(d.gene, PAD.left - 4, y + bH / 2 + 3);
        ctx.fillStyle = color;
        ctx.font = "bold 9px 'Plus Jakarta Sans',sans-serif";
        ctx.textAlign = "left";
        ctx.fillText((d.max_vaf * 100).toFixed(1) + "%", PAD.left + bW + 4, y + bH / 2 + 3);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [data, theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${Math.max(MIN_HEIGHT, data.length * ROW_H + PAD.top + PAD.bottom)}px`, display: "block" }}
    />
  );
}
