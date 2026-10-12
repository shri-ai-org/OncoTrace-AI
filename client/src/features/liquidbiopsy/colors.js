// Token-based color helpers. Each returns a CSS var() reference (a valid CSS color
// value), so callers can drop these straight into inline styles and still pick up
// whatever the active [data-lb-theme] defines — no hardcoded hex anywhere here.

const LOW = "var(--lb-status-low)";
const MODERATE = "var(--lb-status-moderate)";
const HIGH = "var(--lb-status-high)";
const INFO = "var(--lb-status-info)";
const NEUTRAL = "var(--lb-status-neutral)";

export function vafColor(vaf) {
  if (vaf >= 0.5) return HIGH;
  if (vaf >= 0.2) return MODERATE;
  return LOW;
}

export function riskTierColor(tier) {
  const t = String(tier).toUpperCase();
  if (t === "HIGH") return HIGH;
  if (t === "MODERATE") return MODERATE;
  return LOW;
}

// Replaces the old confidenceColor()'s fake "ctDNA candidate" vs "high" split —
// there's no basis for that classification from a single VCF. The real, honest
// signal available per-variant is whether it passed the caller's own filters.
export function filterPassColor(pass) {
  return pass ? LOW : MODERATE;
}

export function depthColor(depth) {
  if (depth >= 500) return LOW;
  if (depth >= 100) return MODERATE;
  return HIGH;
}

export function mqColor(mq) {
  if (mq >= 50) return LOW;
  if (mq >= 30) return MODERATE;
  return HIGH;
}

export function snColor(sn) {
  if (sn >= 10) return LOW;
  if (sn >= 1.5) return MODERATE;
  return HIGH;
}

export function msiColor(msi) {
  if (msi >= 12) return HIGH;
  if (msi >= 6) return MODERATE;
  return LOW;
}

export function nmColor(nm) {
  if (nm >= 5.25) return HIGH;
  if (nm >= 2) return MODERATE;
  return LOW;
}

export const statusColors = { low: LOW, moderate: MODERATE, high: HIGH, info: INFO, neutral: NEUTRAL };

const QUALITATIVE = [
  "var(--lb-chart-1)", "var(--lb-chart-2)", "var(--lb-chart-3)", "var(--lb-chart-4)", "var(--lb-chart-5)",
];

// For categorical (non-severity) breakdowns — variant type, chromosome, etc. —
// so those charts never borrow the status palette and read as risk signals.
export function qualitativeColor(index) {
  return QUALITATIVE[index % QUALITATIVE.length];
}

// Tier colors. Tier 3 (germline pattern) deliberately uses the "info" hue rather
// than a severity color: a hereditary-risk finding is a different clinical
// object from a somatic driver, not a milder version of one.
const TIER_COLORS = {
  tier_1_actionable_somatic: HIGH,
  tier_2_uncertain_needs_review: MODERATE,
  tier_3_germline_pattern_clinically_relevant: INFO,
  tier_4_benign_or_artifact: LOW,
  not_evaluated: NEUTRAL,
};

export const TIER_LABELS = {
  tier_1_actionable_somatic: "Tier 1 — Actionable somatic",
  tier_2_uncertain_needs_review: "Tier 2 — Uncertain / needs review",
  tier_3_germline_pattern_clinically_relevant: "Tier 3 — Germline pattern, clinically relevant",
  tier_4_benign_or_artifact: "Tier 4 — Benign / common / artifact",
  not_evaluated: "Not evaluated",
};

export const TIER_SHORT_LABELS = {
  tier_1_actionable_somatic: "Tier 1",
  tier_2_uncertain_needs_review: "Tier 2",
  tier_3_germline_pattern_clinically_relevant: "Tier 3",
  tier_4_benign_or_artifact: "Tier 4",
  not_evaluated: "Not evaluated",
};

export function tierColor(tier) {
  return TIER_COLORS[tier] || NEUTRAL;
}

// ClinVar's classification vocabulary, surfaced verbatim rather than binarized.
// Benign/likely-benign deliberately render in the calm "low" color: presenting a
// benign polymorphism in alarm-red is precisely the misrepresentation this
// redesign exists to remove.
export function clinvarColor(clnsig) {
  if (!clnsig) return NEUTRAL;
  const s = clnsig.toLowerCase();
  if (s.includes("conflicting")) return MODERATE;
  if (s.includes("pathogenic")) return HIGH;
  if (s.includes("benign")) return LOW;
  if (s.includes("uncertain")) return MODERATE;
  return NEUTRAL;
}
