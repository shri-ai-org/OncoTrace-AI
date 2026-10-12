import { useState } from "react";
import Card from "../primitives/Card";
import SectionHeader from "../primitives/SectionHeader";
import Badge from "../primitives/Badge";
import ProgressBar from "../primitives/ProgressBar";
import { Icon } from "../icons";
import { ICONS } from "../iconPaths";
import { vafColor } from "../colors";
import { fmtVaf } from "../format";

export default function ResistancePage({ data }) {
  const { actionability_summary = {}, variants = [] } = data;
  const [expanded, setExpanded] = useState(null);

  const geneCards = (actionability_summary.genes || []).map((g) => {
    const topVariant = variants.filter((v) => v.gene === g.gene).sort((a, b) => b.vaf - a.vaf)[0];
    return { ...g, topVariant };
  });

  return (
    <div>
      <div style={{
        padding: "14px 16px", borderRadius: "var(--lb-radius-lg)", marginBottom: "16px",
        background: "var(--lb-status-info-bg)", border: "1px solid var(--lb-status-info-border)",
        display: "flex", alignItems: "flex-start", gap: "10px",
      }}>
        <Icon d={ICONS.info} size={14} style={{ color: "var(--lb-status-info)", flexShrink: 0, marginTop: "1px" }} />
        <div style={{ fontSize: "var(--lb-text-xs)", lineHeight: 1.7, color: "var(--lb-text-secondary)" }}>
          <p>{actionability_summary.disclaimer}</p>
          {actionability_summary.evidence_floor_label && (
            <p style={{ marginTop: "8px" }}>
              <strong style={{ color: "var(--lb-text-primary)" }}>Evidence floor: </strong>
              only therapies backed by CIViC evidence at level{" "}
              <strong style={{ color: "var(--lb-text-primary)" }}>{actionability_summary.evidence_floor_label}</strong>{" "}
              or stronger are listed. Preclinical and inferential-only evidence is deliberately withheld so it
              cannot read as a treatment recommendation.
            </p>
          )}
        </div>
      </div>

      {geneCards.length === 0 ? (
        <Card style={{ padding: "24px", textAlign: "center", color: "var(--lb-text-muted)", fontSize: "var(--lb-text-sm)" }}>
          No genes in this file matched our (demo-mode) literature evidence list.
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: "16px", marginBottom: "16px" }}>
          {geneCards.map((g, i) => {
            const v = g.topVariant;
            const isOpen = expanded === i;
            const detailsId = `lb-resistance-details-${i}`;
            const toggle = () => setExpanded(isOpen ? null : i);
            return (
              <Card key={i} style={{ padding: 0, overflow: "hidden" }} onClick={toggle}>
                <div style={{ padding: "16px 20px", borderLeft: "4px solid var(--lb-status-moderate)", background: "var(--lb-status-moderate-bg)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        {/* The whole card stays clickable for pointer users; this
                            button is the keyboard/screen-reader control for it. */}
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={isOpen ? detailsId : undefined}
                          onClick={(e) => { e.stopPropagation(); toggle(); }}
                          style={{
                            background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", textAlign: "left",
                            font: "inherit", fontSize: "var(--lb-text-md)", fontWeight: 900, color: "var(--lb-text-primary)",
                          }}
                        >
                          {g.gene}
                        </button>
                        <Badge
                          label={g.match_level === "variant" ? "Variant-level evidence" : "Gene-level evidence only"}
                          color={g.match_level === "variant" ? "var(--lb-status-high)" : "var(--lb-status-moderate)"}
                          small
                        />
                        {g.below_floor_only && (
                          <Badge label="Below evidence floor" color="var(--lb-status-neutral)" small />
                        )}
                      </div>
                      {v && <p style={{ fontSize: "var(--lb-text-xs)", fontFamily: "monospace", color: "var(--lb-text-muted)" }}>chr{v.chrom}:{v.pos.toLocaleString()} · {v.type ?? "—"}</p>}
                    </div>
                    {v && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: "var(--lb-text-xl)", fontWeight: 900, color: vafColor(v.vaf), lineHeight: 1 }}>{fmtVaf(v.vaf)}</p>
                        <p style={{ fontSize: "9px", color: "var(--lb-text-muted)" }}>VAF</p>
                      </div>
                    )}
                  </div>
                  {v && (
                    <div style={{ marginTop: "10px" }}>
                      <ProgressBar value={v.vaf * 100} max={100} color={vafColor(v.vaf)} height={5} />
                    </div>
                  )}
                </div>
                {isOpen && (
                  <div id={detailsId} style={{ padding: "16px 20px", borderTop: "1px solid var(--lb-border)" }}>
                    <p style={{ fontSize: "var(--lb-text-sm)", color: "var(--lb-text-secondary)", lineHeight: 1.6, marginBottom: "12px" }}>
                      {g.evidence_summary[0]}
                    </p>
                    <div>
                      <p style={{ fontSize: "var(--lb-text-2xs)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--lb-status-low)", marginBottom: "6px" }}>
                        Therapies associated with this gene in the literature
                      </p>
                      {g.therapies.length === 0 ? (
                        <p style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-muted)" }}>
                          {g.below_floor_only
                            ? "Evidence exists for this gene but all of it falls below the evidence floor, so no therapy is listed."
                            : "No therapy at or above the evidence floor is associated with this gene."}
                        </p>
                      ) : (
                        g.therapies.map((t, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--lb-status-low)", flexShrink: 0 }} />
                            <span style={{ fontSize: "var(--lb-text-xs)", color: "var(--lb-text-secondary)" }}>{t}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <p style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)", marginTop: "10px", fontStyle: "italic" }}>
                      {g.match_level === "variant"
                        ? "Evidence curated for this specific variant."
                        : "General gene-level information — this gene has published evidence, but it is NOT confirmed for the specific variant found in this sample."}
                    </p>
                  </div>
                )}
                <div style={{ padding: "6px 20px 8px", background: "var(--lb-row-hover)", borderTop: "1px solid var(--lb-border)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Icon d={ICONS.chevron} size={12} style={{ color: "var(--lb-text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                  <span style={{ fontSize: "var(--lb-text-2xs)", color: "var(--lb-text-muted)" }}>{isOpen ? "Collapse" : "Expand for details"}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
