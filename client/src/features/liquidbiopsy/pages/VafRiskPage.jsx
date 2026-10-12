import Card from "../primitives/Card";
import SectionHeader from "../primitives/SectionHeader";
import Badge from "../primitives/Badge";
import VAFGeneChart from "../charts/VAFGeneChart";
import { vafColor, filterPassColor, tierColor, TIER_SHORT_LABELS } from "../colors";
import { fmtDepth, fmtVaf } from "../format";

const VAF_GUIDE = [
  { range: "0–10%", interp: "Low fraction — sequencing noise or low-fraction sample", color: "var(--lb-chart-2)" },
  { range: "10–20%", interp: "Sub-clonal somatic", color: "var(--lb-status-info)" },
  { range: "20–50%", interp: "Heterozygous somatic (typical range)", color: "var(--lb-status-moderate)", ideal: true },
  { range: "50–70%", interp: "High variant burden at this locus / possible LOH", color: "var(--lb-status-moderate)" },
  { range: "70–90%", interp: "Near-homozygous; clonal dominance at this locus", color: "var(--lb-status-high)" },
  { range: "90–100%", interp: "Homozygous / complete loss of heterozygosity", color: "var(--lb-status-high)" },
];

// A real (non-demo-panel) VCF can carry thousands of variants -- rendering
// one DOM node per variant in the bubble chart below is what makes this tab
// freeze on open, so cap it to the highest-depth (most reliable) subset.
const BUBBLE_CAP = 400;

// High-risk = clearly clonal on its own (>=50%), or moderately clonal AND
// backed by variant-level actionable evidence -- not just "any red bar".
function isHighRisk(g) {
  const maxVaf = g.max_vaf || 0;
  return maxVaf >= 0.5 || (maxVaf >= 0.2 && g.civic_variant_level_actionable);
}

export default function VafRiskPage({ data, theme }) {
  const { gene_summary = [], variants = [], patient_summary } = data;
  const highVaf = variants.filter((v) => v.vaf >= 0.7).sort((a, b) => b.vaf - a.vaf);
  const maxDepth = variants.reduce((m, v) => Math.max(m, v.depth || 0), 0);
  const bubbleVariants = variants.length > BUBBLE_CAP
    ? [...variants].sort((a, b) => b.depth - a.depth).slice(0, BUBBLE_CAP)
    : variants;

  const genesSorted = [...gene_summary].sort((a, b) => (b.max_vaf || 0) - (a.max_vaf || 0));
  const highRiskGenes = genesSorted.filter(isHighRisk);
  const moderateLowGenes = genesSorted.filter((g) => !isHighRisk(g));
  const highRiskChartData = highRiskGenes.map((g) => ({ gene: g.gene, max_vaf: g.max_vaf }));

  return (
    <div>
      {/* Key gene findings, in plain language, color-coded by the same real
          evidence tier used everywhere else in this app -- relocated here
          from Doctor Summary so page 1 leads with charts, grouped above the
          VAF-magnitude-ranked high-risk list below it (curated evidence
          first, quantitative ranking second). */}
      {patient_summary?.gene_cards?.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <SectionHeader title="Key Gene Findings" accent="var(--lb-status-info)" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: "12px" }}>
            {patient_summary.gene_cards.map((g, i) => {
              const c = tierColor(g.evidence_basis);
              return (
                <div key={i} style={{
                  padding: "16px", borderRadius: "var(--lb-radius-lg)",
                  background: `color-mix(in srgb, ${c} 6%, var(--lb-row-hover))`,
                  border: "1px solid var(--lb-border)", borderLeft: `4px solid ${c}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 900, color: "var(--lb-text-primary)" }}>{g.gene}</span>
                    {g.plain_name && <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-secondary)" }}>— {g.plain_name}</span>}
                    {g.evidence_basis && <Badge label={TIER_SHORT_LABELS[g.evidence_basis] || g.evidence_basis} color={c} small />}
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-status-info)", marginBottom: "3px" }}>What We Found</p>
                    <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-primary)", lineHeight: 1.5 }}>{g.finding}</p>
                  </div>
                  <div style={{ marginBottom: "8px" }}>
                    <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-status-low)", marginBottom: "3px" }}>Why It Matters</p>
                    <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)", lineHeight: 1.5 }}>{g.why}</p>
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-status-info-bg)", border: "1px solid var(--lb-status-info-border)" }}>
                    <p style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: "var(--lb-status-info)" }}>→ {g.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High-risk genes listed on their own -- not mixed into a
          single chart with every other gene in the panel. Flat section: the
          per-gene rows below already carry their own high-severity tint. */}
      <div style={{ marginBottom: "24px" }}>
        <SectionHeader title={`High-Risk / Highly Mutated Genes (${highRiskGenes.length})`} accent="var(--lb-status-high)" />
        {highRiskGenes.length === 0 ? (
          <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-muted)" }}>
            No genes in this file reached the high-risk threshold (≥50% of DNA fragments altered, or ≥20% with
            variant-level actionable evidence).
          </p>
        ) : (
          <>
            <VAFGeneChart data={highRiskChartData} theme={theme} />
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {highRiskGenes.map((g, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", flexWrap: "wrap",
                  borderRadius: "var(--lb-radius-md)", background: "var(--lb-status-high-bg)", border: "1px solid var(--lb-status-high-border)",
                }}>
                  <span style={{ fontSize: "var(--lb-text-sm)", fontWeight: 900, color: "var(--lb-text-primary)", width: "70px", flexShrink: 0 }}>{g.gene}</span>
                  <span style={{ fontSize: "var(--lb-text-lg)", fontWeight: 900, color: "var(--lb-status-high)", width: "60px", flexShrink: 0 }}>{((g.max_vaf || 0) * 100).toFixed(1)}%</span>
                  <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", flex: 1 }}>{g.variant_count} variant{g.variant_count !== 1 ? "s" : ""}</span>
                  {g.civic_variant_level_actionable && <Badge label="Variant-level evidence" color="var(--lb-status-high)" small />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Everything else, de-emphasized -- present for completeness, not
          flagged for attention. */}
      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <SectionHeader title={`Moderate-to-Low Risk Genes (${moderateLowGenes.length})`} accent="var(--lb-status-low)" />
        <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "12px" }}>
          Below the high-risk threshold — typically sub-clonal variants, sequencing noise, or common background
          findings.
        </p>
        {moderateLowGenes.length === 0 ? (
          <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-muted)" }}>None — every gene with a finding in this file is listed above.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: "6px" }}>
            {moderateLowGenes.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px" }}>
                <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: "var(--lb-text-secondary)", width: "56px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{g.gene}</span>
                <div style={{ flex: 1, height: "4px", background: "var(--lb-track)", borderRadius: "var(--lb-radius-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((g.max_vaf || 0) * 100, 100)}%`, background: vafColor(g.max_vaf), borderRadius: "var(--lb-radius-full)" }} />
                </div>
                <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", width: "34px", textAlign: "right", flexShrink: 0 }}>{((g.max_vaf || 0) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
        <Card style={{ padding: "20px" }}>
          <SectionHeader title="VAF Interpretation Guide" accent="var(--lb-status-info)" />
          {VAF_GUIDE.map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px",
              padding: "8px 10px", borderRadius: "var(--lb-radius-sm)",
              background: r.ideal ? "var(--lb-status-low-bg)" : "transparent",
              border: r.ideal ? "1px solid var(--lb-status-low-border)" : "1px solid transparent",
            }}>
              <span style={{ width: "44px", fontSize: "var(--lb-text-2xs)", fontWeight: 700, color: r.color, flexShrink: 0 }}>{r.range}</span>
              <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)" }}>{r.interp}</span>
              {r.ideal && <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-status-low)", fontWeight: 700, marginLeft: "auto" }}>Typical somatic</span>}
            </div>
          ))}
        </Card>

        <Card style={{ padding: "20px" }}>
          <SectionHeader title="High-VAF Variants" accent="var(--lb-status-high)" />
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "12px" }}>Variants with VAF ≥ 70%, highest first</p>
          {highVaf.length === 0 && <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)" }}>None in this file.</p>}
          {highVaf.map((v, i) => {
            const isPass = (v.filter || []).length === 1 && v.filter[0] === "PASS";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "10px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-row-hover)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "var(--lb-text-sm)", fontWeight: 900, color: "var(--lb-status-info)" }}>{v.gene ?? "—"}</span>
                    <Badge label={v.type ?? "—"} color="var(--lb-chart-2)" small />
                    <Badge label={(v.filter || []).join(";")} color={filterPassColor(isPass)} small />
                  </div>
                  <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>chr{v.chrom}:{v.pos.toLocaleString()} · Depth: {fmtDepth(v.depth)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "var(--lb-text-lg)", fontWeight: 900, color: vafColor(v.vaf), lineHeight: 1 }}>{fmtVaf(v.vaf)}</p>
                  <p style={{ fontSize: "9px", color: "var(--lb-text-muted)" }}>VAF</p>
                </div>
              </div>
            );
          })}
        </Card>

        <Card style={{ padding: "20px" }}>
          <SectionHeader title="Depth vs VAF" accent="var(--lb-chart-2)" />
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "12px" }}>
            Bubble size = read depth. High depth + moderate VAF (20–50%) are generally the most reliable calls.
            {variants.length > BUBBLE_CAP && ` Showing the ${BUBBLE_CAP} highest-depth of ${variants.length} variants; the full set is in Variant Analysis.`}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {bubbleVariants.map((v, i) => (
              <div key={i} title={`${v.gene ?? "—"}: VAF=${fmtVaf(v.vaf)}, Depth=${fmtDepth(v.depth)}`} style={{ display: "inline-flex" }}>
                <div style={{
                  width: `${Math.max(8, maxDepth > 0 ? (v.depth / maxDepth) * 24 : 0)}px`,
                  height: `${Math.max(8, maxDepth > 0 ? (v.depth / maxDepth) * 24 : 0)}px`,
                  borderRadius: "50%",
                  background: vafColor(v.vaf),
                  opacity: 0.75,
                  cursor: "pointer",
                }} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "10px" }}>Hover a bubble for its gene, VAF, and depth.</p>
        </Card>
      </div>
    </div>
  );
}
