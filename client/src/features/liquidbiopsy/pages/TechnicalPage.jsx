import Card from "../primitives/Card";
import Badge from "../primitives/Badge";
import SectionHeader from "../primitives/SectionHeader";
import StatRow from "../primitives/StatRow";
import ProgressBar from "../primitives/ProgressBar";
import BarChart from "../charts/BarChart";
import { Icon } from "../icons";
import { ICONS } from "../iconPaths";
import { depthColor, mqColor, msiColor, tierColor } from "../colors";
import { fmtDepth } from "../format";

// Three shared grid widths for this page instead of a different minmax()
// picked per section -- keeps the auto-fit reflow rhythm consistent instead
// of columns resizing unpredictably relative to neighboring sections.
const GRID_SMALL = "repeat(auto-fit,minmax(min(160px,100%),1fr))";
const GRID_MEDIUM = "repeat(auto-fit,minmax(min(220px,100%),1fr))";
const GRID_WIDE = "repeat(auto-fit,minmax(min(280px,100%),1fr))";

// The uploaded filename, not a fabricated name -- this app has no real
// patient-identity field (confirmed against the schema: sample_id and
// source_filename are the only identifiers anywhere in the response), so the
// honest stand-in for "patient name" is literally what the file was named.
function displayNameFromFilename(filename) {
  if (!filename) return null;
  return filename.replace(/\.vcf\.gz$/i, "").replace(/\.vcf$/i, "");
}

function IconBadge({ icon, color, size = 32 }) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: "var(--lb-radius-md)", flexShrink: 0,
      background: `color-mix(in srgb, ${color} 16%, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon d={ICONS[icon]} size={size * 0.47} style={{ color }} />
    </div>
  );
}

const HEADLINE_TIERS = [
  { key: "tier_1_actionable_somatic", label: "Actionable Somatic", icon: "target" },
  { key: "tier_2_uncertain_needs_review", label: "Needs Review", icon: "eye" },
  { key: "tier_3_germline_pattern_clinically_relevant", label: "Germline Pattern", icon: "shield" },
];

export default function TechnicalPage({ data }) {
  const { technical_report, meta, qc_summary, variants, tier_summary } = data;
  const counts = tier_summary?.counts || {};

  const patientName = displayNameFromFilename(meta.source_filename);
  let analysisDate = null;
  try {
    analysisDate = new Date(meta.analysis_timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { /* leave null if unparseable */ }

  const skippedStages = Object.entries(meta.stages || {}).filter(([, s]) => s.status !== "ran");

  const kpis = [
    { label: "Mean Depth", value: fmtDepth(qc_summary.depth.mean), color: "var(--lb-status-info)", ideal: "≥500×" },
    { label: "Max Depth", value: fmtDepth(qc_summary.depth.max), color: "var(--lb-status-low)" },
    { label: "Min Depth", value: fmtDepth(qc_summary.depth.min), color: "var(--lb-status-moderate)", ideal: "≥100×" },
    { label: "Mean Map Quality", value: qc_summary.mapping_quality.mean, color: "var(--lb-status-info)", ideal: "≥30 (ideal 60)" },
    { label: "Pass Filter", value: `${qc_summary.pass_count}/${qc_summary.total_records}`, color: "var(--lb-status-low)", sub: `${Math.round(qc_summary.pass_rate * 100)}%` },
    { label: "Non-Pass", value: `${qc_summary.non_pass_count}/${qc_summary.total_records}`, color: "var(--lb-status-moderate)" },
  ];

  const depthData = variants.slice(0, 20).map((v) => ({ label: v.gene ?? "—", count: v.depth, color: depthColor(v.depth) }));
  const mqData = variants.slice(0, 20).map((v) => ({ label: v.gene ?? "—", count: v.mq, color: mqColor(v.mq) }));
  const strandBiasCandidates = variants.filter((v) => v.sbf > 0).sort((a, b) => b.oddratio - a.oddratio).slice(0, 8);
  const msiCandidates = variants.filter((v) => v.msi > 0).sort((a, b) => b.msi - a.msi).slice(0, 10);

  return (
    <div>
      {/* Report masthead -- sample identity, analysis metadata, and headline
          tier counts, relocated here from Doctor Summary so that page stays
          lean on charts. Reference build / genes covered / analysis date are
          all analysis-provenance details, making this technical-report page
          their natural home. */}
      <Card style={{
        padding: "20px 22px", marginBottom: "16px", position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, color-mix(in srgb, var(--lb-brand) 12%, var(--lb-bg-surface)) 0%, var(--lb-bg-surface) 65%)",
        borderTop: "3px solid var(--lb-brand)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "var(--lb-radius-lg)", flexShrink: 0,
              background: "color-mix(in srgb, var(--lb-brand) 18%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon d={ICONS.dna} size={26} style={{ color: "var(--lb-brand)" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--lb-text-xl)", fontWeight: 800, color: "var(--lb-text-primary)" }}>
                  {patientName || `Sample ${meta.sample_id}`}
                </span>
                {counts.tier_1_actionable_somatic > 0 ? (
                  <Badge label={`${counts.tier_1_actionable_somatic} actionable somatic finding${counts.tier_1_actionable_somatic > 1 ? "s" : ""}`} color="var(--lb-status-high)" />
                ) : (
                  <Badge label="No actionable somatic finding" color="var(--lb-status-low)" />
                )}
              </div>
              <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)" }}>Sample ID: {meta.sample_id}</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {[
              { l: "Reference Build", v: `${meta.reference_build}${meta.reference_build_confirmed ? "" : " (unconfirmed)"}`, icon: "layers" },
              { l: "Genes Covered", v: meta.panel_gene_count, icon: "dna" },
              { l: "Analysis Date", v: analysisDate || "—", icon: "calendar" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "9px", padding: "9px 12px",
                borderRadius: "var(--lb-radius-md)", background: "var(--lb-bg-surface-raised)", border: "1px solid var(--lb-border)",
              }}>
                <Icon d={ICONS[item.icon]} size={14} style={{ color: "var(--lb-text-muted)", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lb-text-muted)", lineHeight: 1 }}>{item.l}</p>
                  <p style={{ fontSize: "var(--lb-text-sm)", fontWeight: 700, color: "var(--lb-text-primary)", marginTop: "3px" }}>{item.v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Headline tier counts -- the same tier_summary.counts driving the
            Findings Overview donut on Doctor Summary, surfaced here as bold
            at-a-glance boxes. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: "10px" }}>
          {HEADLINE_TIERS.map((t) => {
            const color = tierColor(t.key);
            const value = counts[t.key] || 0;
            return (
              <div key={t.key} style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                borderRadius: "var(--lb-radius-lg)", background: `color-mix(in srgb, ${color} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              }}>
                <IconBadge icon={t.icon} color={color} size={38} />
                <div>
                  <p style={{ fontSize: "26px", fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--lb-text-secondary)", marginTop: "4px" }}>{t.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pipeline stages: a stage that did not run is shown as such, never as
          a negative result. Flat section -- the stage chips already carry
          their own ran/skipped color. */}
      <div style={{ marginBottom: "24px" }}>
        <SectionHeader title="Pipeline Stages" accent="var(--lb-status-neutral)" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {Object.entries(meta.stages || {}).map(([stage, s]) => {
            const ran = s.status === "ran";
            return (
              <div key={stage} title={s.detail || s.status} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 10px", borderRadius: "var(--lb-radius-sm)",
                background: ran ? "var(--lb-status-low-bg)" : "var(--lb-status-moderate-bg)",
                border: `1px solid ${ran ? "var(--lb-status-low-border)" : "var(--lb-status-moderate-border)"}`,
              }}>
                <Icon d={ran ? ICONS.checkCircle : ICONS.alert} size={12}
                  style={{ color: ran ? "var(--lb-status-low)" : "var(--lb-status-moderate)" }} />
                <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 600, color: "var(--lb-text-primary)" }}>
                  {stage.replace(/_/g, " ")}
                </span>
                {!ran && (
                  <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-status-moderate)" }}>
                    {s.status.replace("skipped_", "").replace(/_/g, " ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {skippedStages.length > 0 && (
          <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "10px", lineHeight: 1.6 }}>
            Stages not marked complete had a missing input or an unsupported precondition — their findings are
            absent, not negative. Hover any stage for the exact reason.
          </p>
        )}
      </div>

      {/* Flat section -- these are uncolored key/value pairs, no severity
          coding to carry, so an outer Card plus per-item boxes was two
          layers of chrome around plain reference text. */}
      <div style={{ marginBottom: "24px" }}>
        <SectionHeader title="Pipeline & Annotation Versions" accent="var(--lb-status-info)" />
        <div style={{ display: "grid", gridTemplateColumns: GRID_MEDIUM, gap: "16px 20px" }}>
          {[
            { l: "Parser", v: technical_report.pipeline.parser },
            { l: "Normalization", v: technical_report.pipeline.normalization },
            { l: "Functional Annotator", v: technical_report.pipeline.annotator },
            { l: "ClinVar Join", v: technical_report.pipeline.clinvar_join },
            { l: "CIViC Join", v: technical_report.pipeline.civic_join },
            { l: "SnpEff DB", v: meta.annotation_versions.snpeff_db },
            { l: "ClinVar Release", v: meta.annotation_versions.clinvar_release },
            { l: "CIViC Release", v: meta.annotation_versions.civic_release },
          ].map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)", marginBottom: "4px" }}>{item.l}</p>
              <p style={{ fontSize: "var(--lb-text-sm)", fontWeight: 700, color: "var(--lb-text-primary)" }}>{item.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QC metrics -- moved here as-is; raw acronyms/thresholds belong in
          the technical appendix, not on a doctor-facing page. Consolidated
          into one card with an internal tile grid, matching the same
          pattern the doctor-facing "At a Glance" section already uses,
          instead of six separate single-value cards. */}
      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <SectionHeader title="Sequencing QC Metrics" accent="var(--lb-status-info)" />
        <div style={{ display: "grid", gridTemplateColumns: GRID_SMALL, gap: "12px" }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ padding: "14px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-row-hover)", border: "1px solid var(--lb-border)" }}>
              <p style={{ fontSize: "var(--lb-text-xl)", fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: "var(--lb-text-xs)", fontWeight: 600, color: "var(--lb-text-secondary)", marginTop: "6px" }}>{k.label}</p>
              {k.ideal && <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "3px" }}>Ideal: {k.ideal}</p>}
              {k.sub && <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "3px" }}>{k.sub}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: GRID_WIDE, gap: "16px", marginBottom: "16px" }}>
        <Card style={{ padding: "20px" }}>
          <SectionHeader title="Sequencing Depth per Variant (first 20)" accent="var(--lb-status-info)" />
          <BarChart data={depthData} xKey="label" yKey="count" colorKey="color" height={160} />
          <div style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[{ l: "≥500× (excellent)", c: "var(--lb-status-low)" }, { l: "100–500× (adequate)", c: "var(--lb-status-moderate)" }, { l: "<100× (low)", c: "var(--lb-status-high)" }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: r.c }} />
                <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-secondary)" }}>{r.l}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: "20px" }}>
          <SectionHeader title="Mapping Quality (MQ) per Variant (first 20)" accent="var(--lb-status-low)" />
          <BarChart data={mqData} xKey="label" yKey="count" colorKey="color" height={160} />
          <div style={{ marginTop: "8px", padding: "10px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-row-hover)", border: "1px solid var(--lb-border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {[{ l: "MQ = 60", d: "Perfectly unique mapping", c: "var(--lb-status-low)" }, { l: "MQ ≥ 30", d: "Acceptable", c: "var(--lb-status-moderate)" }, { l: "MQ < 30", d: "Poor, artefact risk", c: "var(--lb-status-high)" }].map((r, i) => (
                <div key={i}>
                  <p style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: r.c }}>{r.l}</p>
                  <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>{r.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Flat section -- each item already carries its own pass/fail-colored
          left border and tinted count tile. */}
      <div style={{ marginBottom: "24px" }}>
        <SectionHeader title="Filter Flags Summary" accent="var(--lb-status-moderate)" />
        <div style={{ display: "grid", gridTemplateColumns: GRID_WIDE, gap: "12px" }}>
          {qc_summary.filter_flag_counts.map((f, i) => {
            const color = f.flag === "PASS" ? "var(--lb-status-low)" : "var(--lb-status-moderate)";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "var(--lb-radius-md)", background: "var(--lb-row-hover)", borderLeft: `3px solid ${color}` }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "var(--lb-radius-md)", flexShrink: 0, background: `color-mix(in srgb, ${color} 16%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "18px", fontWeight: 900, color }}>{f.count}</span>
                </div>
                <div>
                  <p style={{ fontSize: "var(--lb-text-sm)", fontWeight: 900, color: "var(--lb-text-primary)" }}>{f.flag}</p>
                  <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", lineHeight: 1.4 }}>{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: GRID_WIDE, gap: "16px", marginBottom: "16px" }}>
        <Card style={{ padding: "20px" }}>
          <SectionHeader title="Strand Bias (SBF) Analysis" accent="var(--lb-chart-4)" />
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "12px", lineHeight: 1.5 }}>
            Strand Bias Fisher p-value: low p-value indicates potential strand bias artefact. Variants with SBF &lt;0.05 AND Odds Ratio &gt;5 are flagged.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {strandBiasCandidates.map((v, i) => {
              const flagged = v.sbf < 0.05 && v.oddratio > 5;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "var(--lb-radius-sm)",
                  background: flagged ? "var(--lb-status-high-bg)" : "var(--lb-row-hover)",
                  border: `1px solid ${flagged ? "var(--lb-status-high-border)" : "var(--lb-border)"}`,
                }}>
                  <span style={{ fontWeight: 900, color: "var(--lb-status-info)", fontSize: "var(--lb-text-sm)", width: "60px", flexShrink: 0 }}>{v.gene ?? "—"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>SBF: {v.sbf}</span>
                      <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>OR: {v.oddratio != null ? v.oddratio.toFixed(2) : "—"}</span>
                    </div>
                    <ProgressBar value={Math.min(v.oddratio, 20)} max={20} color={flagged ? "var(--lb-status-high)" : "var(--lb-status-low)"} height={4} />
                  </div>
                  {flagged && <span style={{ fontSize: "9px", color: "var(--lb-status-high)", fontWeight: 700, flexShrink: 0 }}>⚠ BIAS</span>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ padding: "20px" }}>
          <SectionHeader title="MSI Score per Variant" accent="var(--lb-chart-2)" />
          <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", marginBottom: "12px", lineHeight: 1.5 }}>
            MSI &gt;1 indicates the variant sits in a microsatellite region (higher false-positive risk). MSI &gt;12 triggers the MSI12 filter.
          </p>
          {msiCandidates.map((v, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", fontWeight: 700 }}>
                  {v.gene ?? "—"} <span style={{ color: "var(--lb-text-muted)", fontWeight: 400, fontSize: "var(--lb-text-2xs)" }}>chr{v.chrom}:{v.pos.toLocaleString()}</span>
                </span>
                <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 900, color: msiColor(v.msi) }}>{v.msi}</span>
              </div>
              <ProgressBar value={v.msi} max={20} color={msiColor(v.msi)} height={5} />
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <SectionHeader title="Signal-to-Noise & Mismatch Reference Ranges" accent="var(--lb-status-info)" />
        <div style={{ display: "grid", gridTemplateColumns: GRID_MEDIUM, gap: "16px" }}>
          <div>
            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-status-info)", marginBottom: "10px" }}>Signal-to-Noise (SN)</p>
            {[{ l: "SN < 1.5", d: "Below threshold — SN1.5 filter", c: "var(--lb-status-high)" }, { l: "SN 1.5–10", d: "Acceptable", c: "var(--lb-status-moderate)" }, { l: "SN ≥ 10", d: "Good signal quality", c: "var(--lb-status-low)" }].map((r, i) => (
              <StatRow key={i} label={r.l} value={r.d} color={r.c} />
            ))}
          </div>
          <div>
            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-status-moderate)", marginBottom: "10px" }}>Mean Mismatches (NM)</p>
            {[{ l: "NM < 2", d: "Good — low mismatch rate", c: "var(--lb-status-low)" }, { l: "NM 2–5", d: "Caution — review carefully", c: "var(--lb-status-moderate)" }, { l: "NM ≥ 5.25", d: "NM5.25 filter triggered", c: "var(--lb-status-high)" }].map((r, i) => (
              <StatRow key={i} label={r.l} value={r.d} color={r.c} />
            ))}
            <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "8px" }}>{qc_summary.high_mismatch_count} variant(s) flagged with NM5.25 in this file</p>
          </div>
          <div>
            <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-status-low)", marginBottom: "10px" }}>HiQ Allele Frequency (HIAF)</p>
            <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", lineHeight: 1.6 }}>
              HIAF is VAF computed using only high-quality bases. If HIAF differs significantly from VAF, it may indicate a base-quality issue worth reviewing per-variant.
            </p>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <SectionHeader title="VCF Filter Flag Definitions" accent="var(--lb-status-moderate)" />
        {/* Scrolls sideways on narrow screens: focusable so keyboard users can scroll it too. */}
        <div role="region" aria-label="VCF filter flag definitions" tabIndex={0} style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--lb-text-sm)", minWidth: "400px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--lb-border)" }}>
                <th style={{ paddingBottom: "10px", paddingRight: "16px", textAlign: "left", fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)", width: "100px" }}>Filter</th>
                <th style={{ paddingBottom: "10px", textAlign: "left", fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {technical_report.filter_definitions.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--lb-border)" }}>
                  <td style={{ padding: "9px 16px 9px 0" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "var(--lb-radius-sm)",
                      background: r.flag === "PASS" ? "var(--lb-status-low-bg)" : "var(--lb-status-moderate-bg)",
                      border: `1px solid ${r.flag === "PASS" ? "var(--lb-status-low-border)" : "var(--lb-status-moderate-border)"}`,
                      color: r.flag === "PASS" ? "var(--lb-status-low)" : "var(--lb-status-moderate)",
                      fontSize: "var(--lb-text-xs)", fontWeight: 700,
                    }}>{r.flag}</span>
                  </td>
                  <td style={{ padding: "9px 0", fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)" }}>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Flat section -- these are uncolored key/value pairs, same reasoning
          as Pipeline & Annotation Versions above. */}
      <div>
        <SectionHeader title="Key Field Glossary" accent="var(--lb-chart-2)" />
        <div style={{ display: "grid", gridTemplateColumns: GRID_WIDE, gap: "16px 20px" }}>
          {technical_report.field_glossary.map((item, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ padding: "2px 7px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-status-info-bg)", border: "1px solid var(--lb-status-info-border)", color: "var(--lb-status-info)", fontSize: "var(--lb-text-xs)", fontWeight: 700 }}>{item.field}</span>
                <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)" }}>{item.full_name}</span>
              </div>
              <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", lineHeight: 1.5 }}>{item.definition}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
