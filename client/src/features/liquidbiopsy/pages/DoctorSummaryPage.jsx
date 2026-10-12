import Card from "../primitives/Card";
import DonutChart from "../charts/DonutChart";
import BarChart from "../charts/BarChart";
import VAFTrendLine from "../charts/VAFTrendLine";
import VAFHistogram from "../charts/VAFHistogram";
import Badge from "../primitives/Badge";
import RiskScoreGauge from "../primitives/RiskScoreGauge";
import { Icon } from "../icons";
import { ICONS } from "../iconPaths";
import { tierColor, vafColor, depthColor, mqColor, qualitativeColor, TIER_LABELS, TIER_SHORT_LABELS } from "../colors";

// ═══════════════════════════════════════════════════════════════════════════
// This page mirrors the visual language of a printed clinical NGS report --
// dark navy section bars, a rose brand accent, a 3-column info strip,
// gene/variant tables, and paired chart+table layouts -- while still fully
// following the dashboard's own dark/light theme toggle: every surface,
// border, text, and status color below is the same `--lb-*` token every
// other tab already uses, so switching the toggle restyles this page exactly
// like it restyles the rest of the dashboard. Only the report's fixed brand
// accents (the navy masthead/section bars and the rose highlight) stay
// constant across both themes, the same way a brand color would. Every value
// on this page still traces to a real field already computed elsewhere in
// this app (mockData.js / the real backend's schema.py) -- nothing here is a
// fabricated clinical output.
// ═══════════════════════════════════════════════════════════════════════════

const REPORT_THEME = {
  "--rpt-navy": "#1e293b",
  "--rpt-navy-2": "#2c3a52",
  "--rpt-pink": "#be185d",
  fontFamily: "var(--lb-font-body)",
};

const TIER_ORDER = [
  "tier_1_actionable_somatic",
  "tier_2_uncertain_needs_review",
  "tier_3_germline_pattern_clinically_relevant",
  "tier_4_benign_or_artifact",
  "not_evaluated",
];

// Genomic-order sort, needed for the VAF trend chart -- variants arrive in
// whatever order the file/caller produced, which is usually but not
// guaranteedly coordinate order.
const CHROM_ORDER = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","X","Y","M"];
function chromRank(chrom) {
  const idx = CHROM_ORDER.indexOf(String(chrom).replace(/^chr/i, ""));
  return idx === -1 ? CHROM_ORDER.length : idx;
}

// Rendering one SVG dot per variant is exactly what made other pages freeze on
// a large real file earlier -- stride-downsample so the DOM stays bounded
// regardless of file size, while still spanning the whole genome rather than
// just the first/highest-depth slice.
const TREND_CAP = 600;
function downsample(sorted, cap) {
  if (sorted.length <= cap) return sorted;
  const stride = Math.ceil(sorted.length / cap);
  return sorted.filter((_, i) => i % stride === 0);
}

const DEPTH_BUCKETS = [
  { label: "<100×", min: 0, max: 100, sample: 50 },
  { label: "100–300×", min: 100, max: 300, sample: 200 },
  { label: "300–500×", min: 300, max: 500, sample: 400 },
  { label: "500–1000×", min: 500, max: 1000, sample: 700 },
  { label: "1000×+", min: 1000, max: Infinity, sample: 1200 },
];
function buildDepthHistogram(variants) {
  return DEPTH_BUCKETS.map((b) => ({
    label: b.label,
    count: variants.filter((v) => typeof v.depth === "number" && v.depth >= b.min && v.depth < b.max).length,
    color: depthColor(b.sample),
  }));
}

// Real CIViC evidence, not a synthesized "diagnosis" -- each variant's raw
// evidence list (annotate_civic.py) carries its own `disease` field verbatim
// from CIViC's curation. Surfacing it directly, with the evidence level
// alongside it, discloses exactly how strong the association is rather than
// silently filtering to only the strongest evidence.
const EVIDENCE_LEVEL_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4 };
function buildAssociatedConditions(variants) {
  const byKey = new Map();
  for (const v of variants) {
    const evidence = v.civic?.evidence || [];
    for (const e of evidence) {
      if (!e.disease) continue;
      const level = (e.evidence_level || "").toUpperCase();
      const key = `${v.gene}|${e.disease}`;
      const existing = byKey.get(key);
      if (!existing || (EVIDENCE_LEVEL_RANK[level] ?? 9) < (EVIDENCE_LEVEL_RANK[existing.level] ?? 9)) {
        byKey.set(key, { gene: v.gene, disease: e.disease, level });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => (EVIDENCE_LEVEL_RANK[a.level] ?? 9) - (EVIDENCE_LEVEL_RANK[b.level] ?? 9)).slice(0, 12);
}

// A rule-based synthesis of fields already shown elsewhere on this page --
// not a separate model, and not labeled "AI" for exactly that reason. Every
// sentence traces to a real, disclosed value; nothing here is inferred beyond
// what's already computed.
function buildClinicalImpression({ tier1Genes, tier3Count, conditions, reviewPriority, reviewPriorityFormula }) {
  const sentences = [];
  sentences.push(
    tier1Genes.length > 0
      ? `This sample shows ${tier1Genes.length} actionable somatic finding${tier1Genes.length > 1 ? "s" : ""}, in ${tier1Genes.join(", ")}.`
      : "This sample shows no variant meeting the actionable-somatic bar in this panel."
  );
  if (conditions.length > 0) {
    const top = [...new Set(conditions.slice(0, 3).map((c) => c.disease))].join(", ");
    sentences.push(
      `Based on the mutations found, the possible cancer type(s) most often studied with this evidence in the published `
      + `literature: ${top}. This is a literature association for these specific mutations, not a confirmed diagnosis -- `
      + `a targeted panel VCF cannot determine primary tumor site or stage on its own.`
    );
  }
  if (tier3Count > 0) {
    sentences.push(
      `${tier3Count} finding(s) show a germline (hereditary) pattern rather than a somatic one -- a different clinical `
      + `pathway from a tumor-acquired mutation, worth discussing with a genetic counselor.`
    );
  }
  if (reviewPriority != null) {
    sentences.push(`Clinical Review Priority: ${reviewPriority} (${reviewPriorityFormula}).`);
  }
  return sentences.join(" ");
}

// A disclosed, weighted composite -- every driver below traces to a field
// already shown elsewhere on this page (tier counts, peak VAF, review
// priority, QC pass rate). Weights sum to 100 and are shown alongside each
// driver's contribution, the same "show the formula" approach already used
// for Clinical Review Priority above.
function buildRiskScore({ tier1Count, tier3Count, maxVaf, reviewPriority, reviewPriorityMax, qcPassRate }) {
  const drivers = [
    {
      key: "tier1",
      label: tier1Count > 0
        ? `Actionable somatic burden — ${tier1Count} Tier 1 finding${tier1Count > 1 ? "s" : ""}`
        : "Actionable somatic burden — none found",
      weight: 35,
      contribution: Math.min(1, tier1Count / 3) * 35,
    },
    {
      key: "vaf",
      label: `Clonal dominance — peak VAF ${(maxVaf * 100).toFixed(1)}%`,
      weight: 25,
      contribution: maxVaf * 25,
    },
    {
      key: "review",
      label: `Review-priority load — ${reviewPriority ?? 0} of ${reviewPriorityMax}`,
      weight: 20,
      contribution: reviewPriorityMax > 0 ? Math.min(1, (reviewPriority || 0) / reviewPriorityMax) * 20 : 0,
    },
    {
      key: "tier3",
      label: tier3Count > 0 ? `Germline pattern findings — ${tier3Count}` : "Germline pattern findings — none",
      weight: 10,
      contribution: Math.min(1, tier3Count / 2) * 10,
    },
    {
      key: "qc",
      label: `Sequencing QC pass rate — ${Math.round(qcPassRate * 100)}%`,
      weight: 10,
      contribution: (1 - qcPassRate) * 10,
    },
  ];
  const score = Math.max(0, Math.min(100, drivers.reduce((s, d) => s + d.contribution, 0)));
  const ranked = [...drivers].sort((a, b) => b.contribution - a.contribution);
  if (ranked[0]) ranked[0].dominant = true;
  return { score, drivers: ranked };
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function Callout({ tone = "info", icon = "info", children }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: "var(--lb-radius-lg)", marginBottom: "16px",
      background: `var(--lb-status-${tone}-bg)`, border: `1px solid var(--lb-status-${tone}-border)`,
      display: "flex", alignItems: "flex-start", gap: "10px",
    }}>
      <Icon d={ICONS[icon]} size={14} style={{ color: `var(--lb-status-${tone})`, flexShrink: 0, marginTop: "1px" }} />
      <div style={{ fontSize: "var(--lb-text-xs)", lineHeight: 1.7, color: "var(--lb-text-secondary)" }}>
        {children}
      </div>
    </div>
  );
}

// Full-width dark navy bar with a bold uppercase white label -- the
// report-card section header, replacing this page's old icon-badge header for
// every section, existing and new alike, to match the reference's language.
function ReportBar({ title, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
      padding: "11px 18px", background: "linear-gradient(90deg, var(--rpt-navy) 0%, var(--rpt-navy-2) 100%)",
    }}>
      <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff" }}>
        {title}
      </span>
      {right}
    </div>
  );
}

// A section wrapper pairing ReportBar with a padded body -- every card
// section on this page uses this instead of ad-hoc Card+padding.
function ReportSection({ title, right, bodyStyle, children, style }) {
  return (
    <Card style={{ padding: 0, marginBottom: "16px", ...style }}>
      <ReportBar title={title} right={right} />
      <div style={{ padding: "18px 20px", ...bodyStyle }}>{children}</div>
    </Card>
  );
}

// Small colored pill label, used atop the "Variant Summary" / "Test Details"
// info-bar columns -- mirrors the reference's pink/blue pill headers.
function Pill({ text, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px",
      borderRadius: "var(--lb-radius-sm)", background: `color-mix(in srgb, ${color} 14%, transparent)`, marginBottom: "12px",
    }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color }}>{text}</span>
    </div>
  );
}

// Icon-prefixed label:value row -- the "Sample Information" column's rows,
// mirroring the reference's icon-prefixed patient-info rows.
function IconInfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
      <Icon d={ICONS[icon] || ICONS.file} size={13} style={{ color: "var(--rpt-pink)", flexShrink: 0 }} />
      <span style={{ fontSize: "11px", color: "var(--lb-text-muted)", fontWeight: 700, minWidth: "108px", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: "12px", color: "var(--lb-text-primary)", fontWeight: 700, flex: 1, textAlign: "right",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
        }}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// Plain label:value row (no icon) -- the "Variant Summary" / "Test Details" rows.
function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "6px 0", borderBottom: "1px solid var(--lb-border)" }}>
      <span style={{ fontSize: "11px", color: "var(--lb-text-muted)", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: "12px", color: "var(--lb-text-primary)", fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// Pure-CSS radial gauge for the Clinical Review Priority count -- same
// disclosed value/ceiling shown as text beneath it, just rendered as a ring
// instead of a thin bar so it reads at a glance.
function PriorityGauge({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, ((value || 0) / max) * 100) : 0;
  return (
    <div style={{
      position: "relative", width: "104px", height: "104px", borderRadius: "50%", flexShrink: 0,
      background: `conic-gradient(${color} ${pct}%, var(--lb-track) 0)`,
    }}>
      <div style={{
        position: "absolute", inset: "8px", borderRadius: "50%", background: "var(--lb-bg-surface)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "26px", fontWeight: 900, color, lineHeight: 1 }}>{value ?? "—"}</span>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--lb-text-muted)", marginTop: "2px" }}>of {max}</span>
      </div>
    </div>
  );
}

// Three stacked colored stat badges -- the tier-count "headline numbers",
// mirroring the reference's red/orange/green stat blocks. Tinted rather than
// solid-filled, matching the softer tone used by Badge/Callout elsewhere in
// this design system instead of a full-saturation block.
function TierBadge({ count, color, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
      borderRadius: "var(--lb-radius-md)", marginBottom: "10px",
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      <span style={{ fontSize: "24px", fontWeight: 900, color, lineHeight: 1, minWidth: "34px" }}>{count}</span>
      <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color, lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

// One "what's driving the score" row -- label + weight on top, a filled
// track sized to the driver's share of its own weight underneath, and the
// contribution points on the right.
function DriverBar({ label, weight, contribution, dominant, color }) {
  const pct = weight > 0 ? Math.min(100, (contribution / weight) * 100) : 0;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "5px" }}>
        <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--lb-text-primary)" }}>
          {label}
          {dominant && (
            <span style={{
              marginLeft: "8px", fontSize: "9px", fontWeight: 900, letterSpacing: "0.06em",
              color: "var(--lb-status-high)", textTransform: "uppercase",
            }}>
              Dominant driver
            </span>
          )}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 900, color, flexShrink: 0 }}>+{contribution.toFixed(1)}</span>
      </div>
      <div style={{ height: "7px", background: "var(--lb-track)", borderRadius: "var(--lb-radius-full)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "var(--lb-radius-full)" }} />
      </div>
      <span style={{ fontSize: "9.5px", color: "var(--lb-text-muted)" }}>weight {weight}%</span>
    </div>
  );
}

export default function DoctorSummaryPage({ data, hideDisclaimers = false }) {
  const { meta, tier_summary, patient_summary, variants, variant_type_distribution, gene_summary = [], actionability_summary } = data;
  const counts = tier_summary?.counts || {};
  const totalTiered = TIER_ORDER.reduce((sum, t) => sum + (counts[t] || 0), 0) || 1;

  const tierDonutData = TIER_ORDER
    .filter((t) => (counts[t] || 0) > 0)
    .map((t) => ({ label: TIER_LABELS[t], value: counts[t], color: tierColor(t) }));

  const typeDonutData = (variant_type_distribution || []).map((d, i) => ({ label: d.type, value: d.count, color: qualitativeColor(i) }));
  const totalTyped = typeDonutData.reduce((sum, d) => sum + d.value, 0);

  const trendData = downsample(
    [...variants].sort((a, b) => chromRank(a.chrom) - chromRank(b.chrom) || a.pos - b.pos),
    TREND_CAP
  ).map((v, i) => ({ index: i, vafPct: (v.vaf || 0) * 100, gene: v.gene, chrom: v.chrom, pos: v.pos, tier: v.tier?.tier }));

  const depthHistogram = buildDepthHistogram(variants);

  const tier1Genes = (patient_summary?.gene_cards || [])
    .filter((g) => g.evidence_basis === "tier_1_actionable_somatic")
    .map((g) => g.gene);
  const associatedConditions = buildAssociatedConditions(variants);
  const reviewPriority = tier_summary?.review_priority_count;
  const reviewPriorityFormula = tier_summary?.review_priority_formula;
  const reviewPriorityMax = totalTiered * 2; // formula's own ceiling: 2*tier1 + tier2, if every variant were tier1
  const clinicalImpression = buildClinicalImpression({
    tier1Genes,
    tier3Count: counts.tier_3_germline_pattern_clinically_relevant || 0,
    conditions: associatedConditions,
    reviewPriority,
    reviewPriorityFormula,
  });

  // ── Risk score (page-1 headline gauge) ──
  const maxVaf = gene_summary.reduce((m, g) => Math.max(m, g.max_vaf || 0), 0);
  const { score: riskScore, drivers: riskDrivers } = buildRiskScore({
    tier1Count: counts.tier_1_actionable_somatic || 0,
    tier3Count: counts.tier_3_germline_pattern_clinically_relevant || 0,
    maxVaf,
    reviewPriority,
    reviewPriorityMax,
    qcPassRate: data.qc_summary?.pass_rate ?? 1,
  });
  const riskBand = riskScore >= 67
    ? { label: "High Risk · Priority Review", short: "HIGH", color: "var(--lb-status-high)" }
    : riskScore >= 34
    ? { label: "Average Risk · Routine Review", short: "AVERAGE", color: "var(--lb-status-moderate)" }
    : { label: "Low Risk · Standard Follow-Up", short: "LOW", color: "var(--lb-status-low)" };
  const riskHeadline = tier1Genes.length > 0
    ? `Actionable somatic finding${tier1Genes.length > 1 ? "s" : ""} in ${tier1Genes.join(", ")}`
    : (counts.tier_2_uncertain_needs_review || 0) > 0
    ? "Uncertain variant(s) requiring review"
    : "No actionable or uncertain findings";

  const chrDist = (data.chromosome_distribution || []).map((d, i) => ({ ...d, color: qualitativeColor(i) }));
  const vafHistogramData = (data.vaf_profile?.histogram || []).map((d, i) => ({ ...d, color: qualitativeColor(i) }));
  const filterStatusData = [
    { label: "Pass", value: data.qc_summary?.pass_count || 0, color: "var(--lb-status-low)" },
    { label: "Non-pass", value: data.qc_summary?.non_pass_count || 0, color: "var(--lb-status-moderate)" },
  ];
  const depthPerVariantData = variants.slice(0, 20).map((v) => ({ label: v.gene, count: v.depth, color: depthColor(v.depth) }));
  const mqPerVariantData = variants.slice(0, 20).map((v) => ({ label: v.gene, count: v.mq, color: mqColor(v.mq) }));

  // ── New: per-gene VAF donut (top genes by max VAF) ──
  const topGenesByVaf = gene_summary.slice(0, 5);
  const vafByGeneDonutData = topGenesByVaf.map((g) => ({ label: g.gene, value: Math.round(g.max_vaf * 1000) / 10, color: vafColor(g.max_vaf) }));

  // ── New: "Summary of Clinically Relevant Findings" table -- top genes by
  // VAF, joined to a representative variant and to the actionability lookup,
  // so both "classification" and "clinical significance" are real, disclosed
  // values rather than invented text. ──
  const actionByGene = new Map((actionability_summary?.genes || []).map((g) => [g.gene, g]));
  const FINDINGS_LIMIT = 8;
  const findingsRows = gene_summary.slice(0, FINDINGS_LIMIT).map((g) => {
    const topVariant = variants.filter((v) => v.gene === g.gene).sort((a, b) => b.vaf - a.vaf)[0];
    const action = actionByGene.get(g.gene);
    const tier = topVariant?.tier?.tier;
    return {
      gene: g.gene,
      variantLabel: topVariant ? `${topVariant.ref}>${topVariant.alt}` : "—",
      posLabel: topVariant ? `chr${topVariant.chrom}:${Number(topVariant.pos).toLocaleString()}` : null,
      vafPct: g.max_vaf * 100,
      tier,
      tierLabel: TIER_SHORT_LABELS[tier] || "Not evaluated",
      tierColor: tierColor(tier),
      significance: action
        ? (action.match_level === "variant" ? "Actionable — variant-level evidence" : "Potential relevance — gene-level evidence")
        : "No confirmed clinical evidence for this alteration",
      significanceColor: action
        ? (action.match_level === "variant" ? "var(--lb-status-high)" : "var(--lb-status-moderate)")
        : "var(--lb-status-neutral)",
    };
  });

  // ── New: therapeutic options, grouped by real evidence strength ──
  const actionGenes = actionability_summary?.genes || [];
  const variantLevelGenes = actionGenes.filter((g) => g.match_level === "variant");
  const geneLevelGenes = actionGenes.filter((g) => g.match_level === "gene");

  const qcPassRate = data.qc_summary?.pass_rate;
  const qcAllPass = (data.qc_summary?.non_pass_count || 0) === 0;
  const germlineApplied = data.germline_summary?.applied !== false;

  return (
    <div style={REPORT_THEME}>
      {!hideDisclaimers && meta.disclaimer && <Callout tone="info">{meta.disclaimer}</Callout>}

      {!hideDisclaimers && meta.caller_adapter_warning && (
        <Callout tone="high" icon="alert">
          <strong style={{ color: "var(--lb-status-high)" }}>Unvalidated caller adapter — </strong>
          {meta.caller_adapter_warning}
        </Callout>
      )}

      {!hideDisclaimers && meta.reference_build_corroboration?.status === "conflict" && (
        <Callout tone="high" icon="alert">
          <strong style={{ color: "var(--lb-status-high)" }}>Reference build mismatch — </strong>
          {meta.reference_build_corroboration.warning}
        </Callout>
      )}

      {!hideDisclaimers && !meta.reference_build_confirmed && (
        <Callout tone="moderate" icon="alert">
          <strong style={{ color: "var(--lb-status-moderate)" }}>Reference build unconfirmed — </strong>
          Coordinate-based annotation (ClinVar, CIViC) is refused until the build is confirmed, so
          clinical findings below are absent rather than negative.
        </Callout>
      )}

      {/* ══ Report header banner ══ */}
      <Card style={{ padding: 0, marginBottom: "16px", border: "none", background: "linear-gradient(135deg, var(--rpt-navy) 0%, var(--rpt-navy-2) 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
              background: "color-mix(in srgb, var(--rpt-pink) 26%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d={ICONS.dna} size={26} style={{ color: "var(--rpt-pink)" }} strokeWidth={1.75} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "clamp(14px,2.6vw,19px)", fontWeight: 900, letterSpacing: "0.02em", color: "#fff", lineHeight: 1.25, margin: 0 }}>
                MOLECULAR ONCOLOGY / NGS REPORT
              </p>
              <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--rpt-pink)", marginTop: "4px" }}>
                {meta.panel_name || "Comprehensive Genomic Profile"}
                {meta.reference_build ? ` · Reference Build: ${meta.reference_build}` : ""}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "17px", fontWeight: 900, color: "#fff", letterSpacing: "-0.01em", margin: 0 }}>OncoTrace-AI</p>
            <p style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.62)", marginTop: "2px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Liquid Biopsy Intelligence
            </p>
          </div>
        </div>
      </Card>

      {/* ══ Risk Score — primary page-1 gauge ══ */}
      <ReportSection title="Risk Score">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(230px,100%),1fr) minmax(min(320px,100%),2fr))", gap: "24px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <RiskScoreGauge score={riskScore} color={riskBand.color} />
            <p style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.04em", color: riskBand.color, marginTop: "2px" }}>
              {riskBand.label.toUpperCase()}
            </p>
            <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "4px", textAlign: "center", lineHeight: 1.5 }}>
              Weighted composite of the five inputs at right. Disclosed formula, not a black-box output.
            </p>
          </div>

          <div>
            <p style={{ fontSize: "17px", fontWeight: 900, color: "var(--lb-text-primary)", marginBottom: "6px" }}>{riskHeadline}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              <Badge label={`Tier 1: ${counts.tier_1_actionable_somatic || 0}`} color={tierColor("tier_1_actionable_somatic")} />
              <Badge label={`Tier 2: ${counts.tier_2_uncertain_needs_review || 0}`} color={tierColor("tier_2_uncertain_needs_review")} />
              <Badge label={`Peak VAF ${(maxVaf * 100).toFixed(1)}%`} color={vafColor(maxVaf)} />
              <Badge label={`QC: ${qcAllPass ? "Pass" : "Review"}`} color={qcAllPass ? "var(--lb-status-low)" : "var(--lb-status-moderate)"} />
              <Badge label={`Review Priority ${reviewPriority ?? 0}/${reviewPriorityMax}`} color="var(--lb-status-info)" />
            </div>

            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lb-text-muted)", marginBottom: "10px" }}>
              What Is Driving The Score
            </p>
            {riskDrivers.map((d) => (
              <DriverBar
                key={d.key}
                label={d.label}
                weight={d.weight}
                contribution={d.contribution}
                dominant={d.dominant}
                color={
                  d.key === "tier1" ? "var(--lb-status-high)"
                  : d.key === "vaf" ? "var(--lb-status-moderate)"
                  : d.key === "review" ? "var(--lb-status-info)"
                  : d.key === "tier3" ? "var(--lb-status-info)"
                  : "var(--lb-status-neutral)"
                }
              />
            ))}
          </div>
        </div>
      </ReportSection>

      {/* ══ 3-column info bar ══ */}
      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: "22px" }}>
          {/* Sample Information -- absorbs the old empty "Patient Demographics"
              placeholder card, disclosing the same reserved-for-future-integration
              note honestly rather than empty gray bars. */}
          <div>
            <IconInfoRow icon="file" label="Sample ID" value={meta.sample_id || "—"} />
            <IconInfoRow icon="file" label="Source File" value={meta.source_filename || "—"} />
            <IconInfoRow icon="dna" label="Panel" value={meta.panel_name || "Not specified"} />
            <IconInfoRow icon="shield" label="Reference Build" value={`${meta.reference_build || "Unresolved"}${meta.reference_build_confirmed ? " (confirmed)" : " (unconfirmed)"}`} />
            <IconInfoRow icon="flask" label="Variant Caller" value={meta.caller || "—"} />
            <IconInfoRow icon="calendar" label="Analysis Run" value={formatTimestamp(meta.analysis_timestamp)} />
            <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "10px", lineHeight: 1.5 }}>
              Patient-identity fields (name, date of birth, sex, contact) are reserved for a future
              patient-record integration — no demographic data is collected or inferred by this analysis today.
            </p>
          </div>

          {/* Variant Summary */}
          <div>
            <Pill text="Variant Summary" color="var(--rpt-pink)" />
            <InfoRow label="Total Variants" value={variants.length} />
            <InfoRow label="Genes Tested" value={patient_summary?.genes_tested ?? "—"} />
            <InfoRow label="Genes With Findings" value={patient_summary?.genes_with_findings ?? "—"} />
            <InfoRow label="Median VAF" value={`${Math.round((data.vaf_profile?.median || 0) * 100)}%`} />
            <InfoRow label="Clonal (≥30%)" value={data.vaf_profile?.tiers?.clonal_ge_30pct ?? "—"} />
            <InfoRow label="Subclonal (5–30%)" value={data.vaf_profile?.tiers?.subclonal_5_30pct ?? "—"} />
            <InfoRow label="Low Fraction (<5%)" value={data.vaf_profile?.tiers?.low_fraction_lt_5pct ?? "—"} />
          </div>

          {/* Test Details */}
          <div>
            <Pill text="Test Details" color="var(--lb-status-info)" />
            <InfoRow label="Genes Analyzed" value={meta.panel_gene_count ?? gene_summary.length} />
            <InfoRow label="Sequencing Depth (mean)" value={data.qc_summary?.depth ? `${data.qc_summary.depth.mean}×` : "—"} />
            <InfoRow label="Depth Range" value={data.qc_summary?.depth ? `${data.qc_summary.depth.min}×–${data.qc_summary.depth.max}×` : "—"} />
            <InfoRow label="Mapping Quality (mean)" value={data.qc_summary?.mapping_quality?.mean ?? "—"} />
            <InfoRow label="Panel Footprint" value={meta.panel_footprint_mb ? `${meta.panel_footprint_mb} Mb` : "Not available"} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 0 2px" }}>
              <span style={{ fontSize: "11px", color: "var(--lb-text-muted)", fontWeight: 700 }}>QC Status</span>
              <span style={{
                display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: "var(--lb-radius-sm)",
                fontSize: "11px", fontWeight: 900, letterSpacing: "0.04em",
                background: `var(--lb-status-${qcAllPass ? "low" : "moderate"}-bg)`,
                border: `1px solid var(--lb-status-${qcAllPass ? "low" : "moderate"}-border)`,
                color: `var(--lb-status-${qcAllPass ? "low" : "moderate"})`,
              }}>
                {qcAllPass ? "PASS" : "REVIEW"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ══ Summary of Clinically Relevant Findings ══ */}
      <ReportSection title="Summary of Clinically Relevant Findings">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(230px,100%),1.3fr) minmax(min(360px,100%),3fr))", gap: "20px", alignItems: "start" }}>
          <div>
            <TierBadge count={counts.tier_1_actionable_somatic || 0} color="var(--lb-status-high)" label="Actionable Alterations" />
            <TierBadge count={counts.tier_2_uncertain_needs_review || 0} color="var(--lb-status-moderate)" label="Variants Needing Review" />
            <TierBadge count={counts.tier_3_germline_pattern_clinically_relevant || 0} color="var(--lb-status-info)" label="Germline Pattern Findings" />

            {tierDonutData.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "14px", flexWrap: "wrap" }}>
                <DonutChart data={tierDonutData} size={104} label={String(totalTiered)} sublabel="Variants" />
                <div style={{ flex: 1, minWidth: "140px" }}>
                  {TIER_ORDER.filter((t) => (counts[t] || 0) > 0).map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: tierColor(t), flexShrink: 0 }} />
                      <span style={{ fontSize: "10px", color: "var(--lb-text-secondary)", flex: 1 }}>{TIER_SHORT_LABELS[t]}</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: tierColor(t) }}>{counts[t]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "560px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--lb-border-strong)" }}>
                  {["Gene", "Variant", "VAF (%)", "Classification", "Clinical Significance"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lb-text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findingsRows.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "16px 10px", fontSize: "12px", color: "var(--lb-text-muted)" }}>No genes found in this file.</td></tr>
                )}
                {findingsRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--lb-border)" }}>
                    <td style={{ padding: "9px 10px", fontSize: "12px", fontWeight: 800, color: "var(--lb-text-primary)" }}>{r.gene}</td>
                    <td style={{ padding: "9px 10px", fontSize: "11px", fontFamily: "monospace", color: "var(--lb-text-secondary)" }}>
                      {r.variantLabel}
                      {r.posLabel && <div style={{ fontSize: "9.5px", color: "var(--lb-text-muted)" }}>{r.posLabel}</div>}
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: "12px", fontWeight: 800, color: vafColor(r.vafPct / 100) }}>{r.vafPct.toFixed(1)}%</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: r.tierColor }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: r.tierColor, flexShrink: 0 }} />
                        {r.tierLabel}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: "11px", fontWeight: 600, color: r.significanceColor, maxWidth: "220px" }}>{r.significance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gene_summary.length > FINDINGS_LIMIT && (
              <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "8px" }}>
                Showing the top {FINDINGS_LIMIT} of {gene_summary.length} genes by VAF — see Variant Analysis for the full list.
              </p>
            )}
          </div>
        </div>
      </ReportSection>

      {/* ══ Biomarker/QC list · VAF-by-gene donut · Variant type donut ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
        <ReportSection title="Sample QC & Biomarkers" style={{ marginBottom: 0 }}>
          <InfoRow label="QC Pass Rate" value={qcPassRate != null ? `${Math.round(qcPassRate * 100)}%` : "—"} />
          <InfoRow label="Strand Bias Flags" value={data.qc_summary?.strand_bias_flag_count ?? "—"} />
          <InfoRow label="MSI Elevated" value={data.qc_summary?.msi_elevated_count ?? "—"} />
          <InfoRow label="MSI High" value={data.qc_summary?.msi_high_count ?? "—"} />
          <InfoRow label="High Mismatch Count" value={data.qc_summary?.high_mismatch_count ?? "—"} />
          {germlineApplied ? (
            <>
              <InfoRow label="Heterozygous Pattern" value={data.germline_summary?.putative_heterozygous_germline_pattern ?? 0} />
              <InfoRow label="Homozygous Pattern" value={data.germline_summary?.putative_homozygous_germline_pattern ?? 0} />
              <InfoRow label="Common Population Variant" value={data.germline_summary?.common_population_variant ?? 0} />
            </>
          ) : (
            <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
              {data.germline_summary?.reason}
            </p>
          )}
        </ReportSection>

        <ReportSection title="Variant Allele Frequency — Top Genes" style={{ marginBottom: 0 }}>
          {vafByGeneDonutData.length > 0 ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <DonutChart data={vafByGeneDonutData} size={120} label={`${topGenesByVaf.length}`} sublabel="Genes" />
                <div style={{ flex: 1, minWidth: "140px" }}>
                  {vafByGeneDonutData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "10.5px", color: "var(--lb-text-secondary)", flex: 1 }}>{d.label}</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: d.color }}>{d.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-row-hover)", border: "1px solid var(--lb-border)" }}>
                {[
                  { c: "var(--lb-status-high)", l: "High (≥50%) — Clonal / dominant" },
                  { c: "var(--lb-status-moderate)", l: "Moderate (20–50%) — Subclonal" },
                  { c: "var(--lb-status-low)", l: "Low (<20%) — Minor / emerging" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: i < 2 ? "4px" : 0 }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: r.c, flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-secondary)" }}>{r.l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)" }}>No genes found in this file.</p>
          )}
        </ReportSection>

        {typeDonutData.length > 0 && (
          <ReportSection title="Variant Type Distribution" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <DonutChart data={typeDonutData} size={120} label={String(totalTyped)} sublabel="Total" />
              <div style={{ flex: 1, minWidth: "140px" }}>
                {typeDonutData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "10.5px", color: "var(--lb-text-secondary)", flex: 1 }}>{d.label}</span>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ReportSection>
        )}
      </div>

      {/* ══ Variant Allele Frequency — Genome-Wide Profile (chart + table) ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
        <ReportSection title="Variant Allele Frequency — Genome-Wide Profile" style={{ marginBottom: 0 }}>
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "10px", lineHeight: 1.5 }}>
            How much of the sample's DNA carries each variant, ordered across the genome. This reflects a
            single sequencing time point — longitudinal/serial tracking requires multiple sequential
            samples, which this file does not include. Dashed lines mark the typical clonal (30%) and
            low-fraction (5%) reference points; dot color matches the finding tiers.
          </p>
          <VAFTrendLine data={trendData} />
        </ReportSection>

        <ReportSection title="Top Genes — VAF & Depth" style={{ marginBottom: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "280px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--lb-border-strong)" }}>
                  {["Gene", "VAF", "Depth", "Tier"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: "10px", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lb-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findingsRows.slice(0, 6).map((r, i) => {
                  const v = variants.filter((x) => x.gene === r.gene).sort((a, b) => b.vaf - a.vaf)[0];
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--lb-border)" }}>
                      <td style={{ padding: "8px", fontSize: "11.5px", fontWeight: 800, color: "var(--lb-text-primary)" }}>{r.gene}</td>
                      <td style={{ padding: "8px", fontSize: "11.5px", fontWeight: 800, color: vafColor(r.vafPct / 100) }}>{r.vafPct.toFixed(1)}%</td>
                      <td style={{ padding: "8px", fontSize: "11.5px", color: "var(--lb-text-secondary)" }}>{v?.depth ? `${v.depth}×` : "—"}</td>
                      <td style={{ padding: "8px", fontSize: "11px", fontWeight: 700, color: r.tierColor }}>{r.tierLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ReportSection>
      </div>

      {/* ══ Sequencing Confidence ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
        <ReportSection title="Sequencing Confidence" style={{ marginBottom: 0 }}>
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "10px", lineHeight: 1.5 }}>
            How many independent reads back each result — higher generally means a more reliable call.
          </p>
          <BarChart data={depthHistogram} xKey="label" yKey="count" colorKey="color" height={180} />
        </ReportSection>

        {chrDist.length > 0 && (
          <ReportSection title="Variants per Chromosome" style={{ marginBottom: 0 }}>
            <BarChart data={chrDist} xKey="chrom" yKey="count" colorKey="color" height={180} />
          </ReportSection>
        )}
      </div>

      {vafHistogramData.length > 0 && (
        <ReportSection title={`VAF Distribution Across All ${variants.length} Variants`}>
          <VAFHistogram data={vafHistogramData} />
        </ReportSection>
      )}

      {/* ══ Filter status · per-variant depth · per-variant MQ ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
        <ReportSection title="By Filter Status" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <DonutChart data={filterStatusData} size={120} label={String(variants.length)} sublabel="Variants" />
            <div style={{ flex: 1, minWidth: "110px" }}>
              {filterStatusData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "10.5px", color: "var(--lb-text-secondary)", flex: 1 }}>{d.label}</span>
                  <span style={{ fontSize: "11px", fontWeight: 900, color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Sequencing Depth per Variant (first 20)" style={{ marginBottom: 0 }}>
          <BarChart data={depthPerVariantData} xKey="label" yKey="count" colorKey="color" height={160} />
          <div style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[{ l: "≥500× (excellent)", c: "var(--lb-status-low)" }, { l: "100–500× (adequate)", c: "var(--lb-status-moderate)" }, { l: "<100× (low)", c: "var(--lb-status-high)" }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: r.c }} />
                <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-secondary)" }}>{r.l}</span>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Mapping Quality (MQ) per Variant (first 20)" style={{ marginBottom: 0 }}>
          <BarChart data={mqPerVariantData} xKey="label" yKey="count" colorKey="color" height={160} />
          <div style={{ marginTop: "8px", padding: "10px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-row-hover)", border: "1px solid var(--lb-border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(96px,100%),1fr))", gap: "8px" }}>
              {[{ l: "MQ = 60", d: "Perfectly unique mapping", c: "var(--lb-status-low)" }, { l: "MQ ≥ 30", d: "Acceptable", c: "var(--lb-status-moderate)" }, { l: "MQ < 30", d: "Poor, artefact risk", c: "var(--lb-status-high)" }].map((r, i) => (
                <div key={i}>
                  <p style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: r.c }}>{r.l}</p>
                  <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>{r.d}</p>
                </div>
              ))}
            </div>
          </div>
        </ReportSection>
      </div>

      {/* ══ Next steps ══ */}
      {patient_summary?.next_steps?.length > 0 && (
        <ReportSection title="Typical Next Steps (Illustrative)">
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)", marginBottom: "16px" }}>
            Generic steps in a real clinical workflow — not generated from this specific file.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {patient_summary.next_steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "16px", paddingBottom: i < patient_summary.next_steps.length - 1 ? "20px" : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--rpt-navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 900, color: "#fff" }}>{i + 1}</span>
                  </div>
                  {i < patient_summary.next_steps.length - 1 && <div style={{ width: "2px", flex: 1, background: "var(--lb-border)", marginTop: "4px" }} />}
                </div>
                <div style={{ paddingTop: "6px" }}>
                  <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-primary)", lineHeight: 1.6, fontWeight: 500 }}>{step}</p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* ══ Clinical Impression · Potential Therapeutic Options ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(360px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
        <ReportSection title="Clinical Impression (Rule-Based Summary)" style={{ marginBottom: 0 }}>
          <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-primary)", lineHeight: 1.7, marginBottom: "18px" }}>
            {clinicalImpression}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "18px", flexWrap: "wrap" }}>
            <PriorityGauge value={reviewPriority} max={reviewPriorityMax} color="var(--lb-status-high)" />
            <div>
              <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)", marginBottom: "6px" }}>
                Clinical Review Priority
              </p>
              <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", lineHeight: 1.5 }}>
                A disclosed count, not a black-box score: {reviewPriorityFormula}
              </p>
            </div>
          </div>

          <div>
            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)", marginBottom: "8px" }}>
              Possible Cancer Type (Literature Association)
            </p>
            {associatedConditions.length === 0 ? (
              <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)" }}>
                No CIViC-curated cancer-type association found for any variant in this file.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {associatedConditions.map((c, i) => (
                  <span key={i} title={`${c.gene} — CIViC evidence level ${c.level || "?"}`} style={{
                    fontSize: "var(--lb-text-xs)", padding: "4px 10px", borderRadius: "var(--lb-radius-sm)",
                    background: "var(--lb-status-info-bg)", border: "1px solid var(--lb-status-info-border)", color: "var(--lb-status-info)",
                  }}>
                    {c.disease} <span style={{ opacity: 0.6 }}>({c.gene}, level {c.level || "?"})</span>
                  </span>
                ))}
              </div>
            )}
            <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
              From the mutations found in this file, cross-referenced against CIViC's curated evidence -- not a confirmed
              diagnosis of this patient's cancer type or site, which a VCF alone cannot determine.
            </p>
          </div>

          <div style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-status-info-bg)", border: "1px solid var(--lb-status-info-border)" }}>
            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lb-status-info)", marginBottom: "6px" }}>
              Summary &amp; Next Step
            </p>
            <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-primary)", lineHeight: 1.6 }}>
              This page must be discussed with a treating physician or genetic counselor before any decision is based on it.
            </p>
          </div>
        </ReportSection>

        <ReportSection title="Potential Therapeutic Options" style={{ marginBottom: 0 }}>
          {actionGenes.length === 0 ? (
            <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)" }}>
              No genes in this file matched our literature evidence list.
            </p>
          ) : (
            <>
              {variantLevelGenes.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lb-status-high)", marginBottom: "8px" }}>
                    Variant-Level Evidence
                  </p>
                  {variantLevelGenes.map((g, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      <p style={{ fontSize: "var(--lb-text-sm)", fontWeight: 800, color: "var(--lb-text-primary)" }}>{g.gene}</p>
                      <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", lineHeight: 1.5, marginBottom: "6px" }}>{g.evidence_summary?.[0]}</p>
                      {g.therapies?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {g.therapies.map((t, j) => (
                            <span key={j} style={{ fontSize: "10.5px", padding: "3px 9px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-status-high-bg)", border: "1px solid var(--lb-status-high-border)", color: "var(--lb-status-high)", fontWeight: 700 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {geneLevelGenes.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lb-status-moderate)", marginBottom: "8px" }}>
                    Gene-Level Evidence
                  </p>
                  {geneLevelGenes.map((g, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      <p style={{ fontSize: "var(--lb-text-sm)", fontWeight: 800, color: "var(--lb-text-primary)" }}>{g.gene}</p>
                      <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", lineHeight: 1.5, marginBottom: "6px" }}>{g.evidence_summary?.[0]}</p>
                      {g.therapies?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {g.therapies.map((t, j) => (
                            <span key={j} style={{ fontSize: "10.5px", padding: "3px 9px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-status-moderate-bg)", border: "1px solid var(--lb-status-moderate-border)", color: "var(--lb-status-moderate)", fontWeight: 700 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {actionability_summary?.disclaimer && (
                <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", lineHeight: 1.5, marginBottom: "12px" }}>
                  {actionability_summary.disclaimer}
                </p>
              )}
            </>
          )}

          <div style={{ padding: "10px 12px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-status-neutral-bg)", border: "1px solid var(--lb-status-neutral-border)" }}>
            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 700, color: "var(--lb-text-muted)" }}>
              Clinical trial matching is not available in this analysis.
            </p>
          </div>
        </ReportSection>
      </div>

      {/* ══ Footer ══ */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
        padding: "16px 20px", borderRadius: "var(--lb-radius-lg)", border: "1px solid var(--lb-border)", background: "var(--lb-bg-surface)",
      }}>
        {!hideDisclaimers && meta.disclaimer && (
          <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", lineHeight: 1.6, maxWidth: "620px" }}>
            {meta.disclaimer}
          </p>
        )}
        <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", lineHeight: 1.6, textAlign: "right" }}>
          Generated by OncoTrace-AI Genomics Pipeline<br />
          Caller: {meta.caller || "—"} · {formatTimestamp(meta.analysis_timestamp)}
        </p>
      </div>
    </div>
  );
}
