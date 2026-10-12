import { useMemo, useState } from "react";
import Card from "../primitives/Card";
import SectionHeader from "../primitives/SectionHeader";
import Badge from "../primitives/Badge";
import DonutChart from "../charts/DonutChart";
import BarChart from "../charts/BarChart";
import VAFHistogram from "../charts/VAFHistogram";
import { Icon } from "../icons";
import { ICONS } from "../iconPaths";
import { vafColor, depthColor, mqColor, snColor, msiColor, nmColor, filterPassColor, qualitativeColor, tierColor, TIER_SHORT_LABELS } from "../colors";
import { fmtDepth, fmtVaf } from "../format";

const PAGE_SIZE = 50;

export default function VariantsPage({ data }) {
  const { variants, variant_type_distribution, chromosome_distribution, vaf_profile, structural_variants, patient_summary, actionability_summary } = data;
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [sortField, setSortField] = useState("vaf");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);

  const typeDist = (variant_type_distribution || []).map((d, i) => ({ label: d.type, value: d.count, color: qualitativeColor(i) }));
  const chrDist = (chromosome_distribution || []).map((d, i) => ({ ...d, color: qualitativeColor(i) }));
  const total = variants.length;

  const genesWithLiteratureEvidence = (patient_summary?.genes_with_variant_level_evidence || 0)
    + (actionability_summary?.genes?.length || 0);
  const atAGlance = [
    { label: "Genes Tested", value: patient_summary?.genes_tested ?? 0, icon: "dna", color: "var(--lb-status-info)", sub: "Different gene regions analyzed" },
    { label: "Notable Findings", value: patient_summary?.genes_with_findings ?? 0, icon: "alert", color: "var(--lb-status-moderate)", sub: "Genes with a substantial fraction of altered DNA" },
    { label: "Literature Evidence", value: genesWithLiteratureEvidence, icon: "flask", color: "var(--lb-status-low)", sub: "General associations, not confirmed variant-specific matches" },
  ];

  const filtered = useMemo(() => {
    return variants
      .filter((v) => {
        const isPass = (v.filter || []).length === 1 && v.filter[0] === "PASS";
        // gene is Optional in the API schema (intergenic calls, unannotated SVs).
        const matchSearch = !search || (v.gene ?? "").toLowerCase().includes(search.toLowerCase()) || (v.type ?? "").toLowerCase().includes(search.toLowerCase());
        const qcFlagged = (v.qc?.flags || []).length > 0;
        const matchFilter =
          filterMode === "all" ? true
          : filterMode === "pass" ? isPass
          : filterMode === "nonpass" ? !isPass
          : filterMode === "qc_flagged" ? qcFlagged
          : filterMode === "qc_clean" ? !qcFlagged
          : true;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        let va = a[sortField], vb = b[sortField];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [variants, search, filterMode, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setPage(0);
  };

  // Rendering thousands of table rows at once (a real whole-panel or larger
  // VCF, not just the ~30-gene demo fixture) is what makes this tab freeze on
  // open -- paginate the DOM output while search/sort/filter still operate
  // over the full `filtered` set.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

  return (
    <div>
      {/* At a Glance -- gene-coverage and evidence counts, relocated here
          from Doctor Summary so that page stays lean on charts; this page
          already tracks per-gene/per-variant detail, making it the natural
          home. */}
      <Card style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <SectionHeader title="At a Glance" accent="var(--lb-chart-2)" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(190px,100%),1fr))", gap: "16px" }}>
          {atAGlance.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "var(--lb-radius-md)", flexShrink: 0,
                background: `color-mix(in srgb, ${s.color} 16%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon d={ICONS[s.icon]} size={15} style={{ color: s.color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "22px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: "var(--lb-text-primary)" }}>{s.label}</span>
                </div>
                <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "2px", lineHeight: 1.4 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Three overview modules as one flat, divided section instead of
          three separate floating cards -- they're read together as one
          "overview" glance, not three independent surfaces. */}
      <div className="lb-overview-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: "24px", marginBottom: "24px" }}>
        <div>
          <SectionHeader title="By Variant Type" accent="var(--lb-chart-1)" />
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <DonutChart data={typeDist} label={String(total)} sublabel="Total" />
            <div style={{ flex: 1, minWidth: "120px" }}>
              {typeDist.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", flex: 1 }}>{d.label}</span>
                  <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: "var(--lb-text-primary)" }}>{d.value}</span>
                  <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>({Math.round((d.value / total) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="By Filter Status" accent="var(--lb-status-low)" />
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <DonutChart
              data={[
                { label: "Pass", value: data.qc_summary.pass_count, color: "var(--lb-status-low)" },
                { label: "Non-pass", value: data.qc_summary.non_pass_count, color: "var(--lb-status-moderate)" },
              ]}
              label={String(total)}
              sublabel="Variants"
            />
            <div style={{ flex: 1, minWidth: "120px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--lb-status-low)" }} />
                <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", flex: 1 }}>Pass</span>
                <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: "var(--lb-text-primary)" }}>{data.qc_summary.pass_count}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--lb-status-moderate)" }} />
                <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)", flex: 1 }}>Non-pass</span>
                <span style={{ fontSize: "var(--lb-text-xs)", fontWeight: 700, color: "var(--lb-text-primary)" }}>{data.qc_summary.non_pass_count}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="Variants per Chromosome" accent="var(--lb-chart-3)" />
          <BarChart data={chrDist} xKey="chrom" yKey="count" colorKey="color" height={160} />
        </div>
      </div>

      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <SectionHeader title={`VAF Distribution Across All ${total} Variants`} accent="var(--lb-status-info)" />
        <VAFHistogram data={(vaf_profile?.histogram || []).map((d, i) => ({ ...d, color: qualitativeColor(i) }))} />
      </Card>

      <Card style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)" }}>
            Complete Variant Table ({filtered.length}/{total})
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Icon d={ICONS.search} size={12} style={{ color: "var(--lb-text-muted)", position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search gene or type..."
                aria-label="Search variants by gene or type"
                style={{
                  paddingLeft: "28px", paddingRight: "10px", paddingTop: "7px", paddingBottom: "7px",
                  borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border)", background: "var(--lb-input-bg)",
                  color: "var(--lb-text-primary)", fontSize: "var(--lb-text-sm)", outline: "none", width: "160px",
                }}
              />
            </div>
            <select
              value={filterMode}
              onChange={(e) => { setFilterMode(e.target.value); setPage(0); }}
              aria-label="Filter variants"
              style={{ padding: "7px 12px", borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border)", background: "var(--lb-input-bg)", color: "var(--lb-text-primary)", fontSize: "var(--lb-text-sm)", outline: "none" }}
            >
              <option value="all">All Variants</option>
              <option value="pass">Caller PASS only</option>
              <option value="nonpass">Caller non-PASS only</option>
              <option value="qc_flagged">QC-flagged only</option>
              <option value="qc_clean">QC-clean only</option>
            </select>
          </div>
        </div>

        {/* Scrolls sideways on narrow screens: focusable so keyboard users can scroll it too. */}
        <div role="region" aria-label="Variants table" tabIndex={0} style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--lb-text-xs)", minWidth: "1180px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--lb-border)" }}>
                {[
                  { f: "gene", l: "Gene" }, { f: "chrom", l: "Chr" }, { f: "pos", l: "Position" },
                  { f: "type", l: "Type" }, { f: "vaf", l: "VAF" }, { f: "depth", l: "Depth" },
                  { f: "mq", l: "MQ" }, { f: "sn", l: "S/N" }, { f: "msi", l: "MSI" },
                  { f: "nm", l: "NM" }, { f: "filter", l: "Filter" },
                  { f: "tier", l: "Tier" }, { f: "qc", l: "QC Flags" },
                ].map((h, hi) => (
                  <th
                    key={h.f}
                    aria-sort={sortField === h.f ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                    style={{
                      paddingBottom: "10px", paddingRight: "10px", textAlign: "left",
                      fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em",
                      color: sortField === h.f ? "var(--lb-status-info)" : "var(--lb-text-muted)",
                      ...(hi === 0 ? { position: "sticky", left: 0, background: "var(--lb-bg-surface)", zIndex: 1 } : {}),
                    }}
                  >
                    {/* A real button so the sort is reachable by keyboard; the
                        <th> keeps the type styling and the button inherits it. */}
                    <button
                      type="button"
                      onClick={() => handleSort(h.f)}
                      style={{
                        background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", userSelect: "none",
                        font: "inherit", color: "inherit", letterSpacing: "inherit", textTransform: "inherit", textAlign: "inherit",
                      }}
                    >
                      {h.l} <span aria-hidden="true">{sortField === h.f ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v, i) => {
                const isPass = (v.filter || []).length === 1 && v.filter[0] === "PASS";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--lb-border)" }}>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 900, color: "var(--lb-status-info)", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--lb-bg-surface)" }}>{v.gene ?? "—"}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontFamily: "monospace", color: "var(--lb-text-secondary)" }}>{v.chrom}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontFamily: "monospace", color: "var(--lb-text-secondary)", whiteSpace: "nowrap" }}>{v.pos.toLocaleString()}</td>
                    <td style={{ padding: "9px 10px 9px 0" }}>
                      <span style={{ padding: "2px 6px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-row-hover)", border: "1px solid var(--lb-border)", color: "var(--lb-text-secondary)", fontSize: "var(--lb-text-2xs)", whiteSpace: "nowrap" }}>{v.type ?? "—"}</span>
                    </td>
                    <td style={{ padding: "9px 10px 9px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "36px", height: "4px", background: "var(--lb-track)", borderRadius: "var(--lb-radius-full)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(v.vaf * 100, 100)}%`, background: vafColor(v.vaf), borderRadius: "var(--lb-radius-full)" }} />
                        </div>
                        <span style={{ fontWeight: 700, color: vafColor(v.vaf), fontVariantNumeric: "tabular-nums" }}>{fmtVaf(v.vaf)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "9px 10px 9px 0" }}><span style={{ color: depthColor(v.depth), fontWeight: 700 }}>{fmtDepth(v.depth)}</span></td>
                    <td style={{ padding: "9px 10px 9px 0" }}><span style={{ color: mqColor(v.mq), fontWeight: 700 }}>{v.mq}</span></td>
                    <td style={{ padding: "9px 10px 9px 0" }}><span style={{ color: snColor(v.sn), fontWeight: 700 }}>{v.sn}</span></td>
                    <td style={{ padding: "9px 10px 9px 0" }}><span style={{ color: msiColor(v.msi), fontWeight: 700 }}>{v.msi}</span></td>
                    <td style={{ padding: "9px 10px 9px 0" }}><span style={{ color: nmColor(v.nm), fontWeight: 700 }}>{v.nm}</span></td>
                    <td style={{ padding: "9px 10px 9px 0" }}><Badge label={(v.filter || []).join(";")} color={filterPassColor(isPass)} small /></td>
                    <td style={{ padding: "9px 10px 9px 0" }}>
                      {v.tier?.tier && (
                        <span title={(v.tier.reasons || []).join(" · ")}>
                          <Badge label={TIER_SHORT_LABELS[v.tier.tier] || v.tier.tier} color={tierColor(v.tier.tier)} small />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 0" }}>
                      {(v.qc?.flags || []).length === 0 ? (
                        <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>clean</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", maxWidth: "220px" }}>
                          {v.qc.flags.map((f, fi) => (
                            <span key={fi} title={f.reason}>
                              <Badge
                                label={f.flag.replace(/_/g, " ").replace("artifact contamination candidate", "contaminant")}
                                color={
                                  f.flag === "artifact_contamination_candidate" || f.flag === "duplicate_representation"
                                    ? "var(--lb-status-high)" : "var(--lb-status-moderate)"
                                }
                                small
                              />
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>
              Showing {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                data-lb-btn="utility"
                style={{
                  padding: "6px 12px", borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border)",
                  background: "var(--lb-input-bg)", color: "var(--lb-text-primary)", fontSize: "var(--lb-text-xs)",
                  cursor: clampedPage === 0 ? "default" : "pointer", opacity: clampedPage === 0 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)" }}>
                Page {clampedPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={clampedPage >= pageCount - 1}
                data-lb-btn="utility"
                style={{
                  padding: "6px 12px", borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-border)",
                  background: "var(--lb-input-bg)", color: "var(--lb-text-primary)", fontSize: "var(--lb-text-xs)",
                  cursor: clampedPage >= pageCount - 1 ? "default" : "pointer", opacity: clampedPage >= pageCount - 1 ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--lb-border)" }}>
          <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>
            Depth: ≥500=good, ≥100=caution · MQ: ≥50=good, ≥30=caution · S/N: ≥10=good · MSI: ≥12=flag · NM: ≥5.25=flag
          </p>
        </div>
      </Card>

      {structural_variants.length > 0 ? (
        <Card style={{ padding: "20px" }}>
          <SectionHeader title="Structural Variants (Large Deletions)" accent="var(--lb-chart-2)" />
          <div role="region" aria-label="Structural variants table" tabIndex={0} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--lb-text-sm)", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--lb-border)" }}>
                  {["Gene", "Chr", "Position", "SV Type", "SV Length", "VAF", "Split Reads", "Span Pairs"].map((h, hi) => (
                    <th key={h} style={{
                      paddingBottom: "10px", paddingRight: "12px", textAlign: "left", fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-text-muted)",
                      ...(hi === 0 ? { position: "sticky", left: 0, background: "var(--lb-bg-surface)", zIndex: 1 } : {}),
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {structural_variants.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--lb-border)" }}>
                    <td style={{ padding: "10px 12px 10px 0", fontWeight: 900, color: "var(--lb-status-info)", position: "sticky", left: 0, background: "var(--lb-bg-surface)" }}>{r.gene ?? "—"}</td>
                    <td style={{ padding: "10px 12px 10px 0", fontFamily: "monospace", color: "var(--lb-text-secondary)" }}>{r.chrom}</td>
                    <td style={{ padding: "10px 12px 10px 0", fontFamily: "monospace", color: "var(--lb-text-secondary)" }}>{r.pos.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px 10px 0" }}><Badge label={r.svtype ?? "—"} color="var(--lb-chart-2)" small /></td>
                    {/* No SVLEN for breakends (BND) and some callers' INS records. */}
                    <td style={{ padding: "10px 12px 10px 0", fontWeight: 700, color: "var(--lb-text-primary)" }}>{r.svlen != null ? `${r.svlen.toLocaleString()} bp` : "—"}</td>
                    <td style={{ padding: "10px 12px 10px 0", fontWeight: 700, color: vafColor(r.vaf) }}>{fmtVaf(r.vaf)}</td>
                    <td style={{ padding: "10px 12px 10px 0", color: "var(--lb-text-primary)" }}>{r.splitread}</td>
                    <td style={{ padding: "10px 0", color: "var(--lb-text-primary)" }}>{r.spanpair}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: "20px", textAlign: "center", color: "var(--lb-text-muted)", fontSize: "var(--lb-text-sm)" }}>
          No structural variants called in this file.
        </Card>
      )}

      <style>{`
        @media (min-width: 900px) {
          .lb-overview-row > div:nth-child(2),
          .lb-overview-row > div:nth-child(3) {
            border-left: 1px solid var(--lb-border);
            padding-left: 24px;
          }
        }
      `}</style>
    </div>
  );
}
