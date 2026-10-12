/* Display formatters for analysis values the schema allows to be null
   (server/app/schema.py: Variant.vaf / Variant.depth, DepthStats.*). A
   missing value reads as a dash, never as "0.0%" or "null×". */

export const DASH = "—";

/** 0.123 -> "12.3%"; null -> "—" */
export function fmtVaf(v) {
  return v == null || Number.isNaN(v) ? DASH : `${(v * 100).toFixed(1)}%`;
}

/** 1234 -> "1,234×"; null -> "—" */
export function fmtDepth(d) {
  return d == null || Number.isNaN(d) ? DASH : `${Number(d).toLocaleString()}×`;
}
