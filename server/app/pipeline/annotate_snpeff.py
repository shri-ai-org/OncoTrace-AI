"""SnpEff functional annotation, run locally against pre-downloaded genome
databases. No network call at request time -- the databases are provisioned
once by scripts/download_references.sh.

Parses INFO/ANN (pipe-delimited, comma-separated across transcripts) into
per-variant consequence/HGVS records. Keeps the full multi-transcript list so
the technical report can show transcript-level disagreement rather than hiding
it, and records SnpEff's own warning codes verbatim so a low-confidence call
renders as annotation-uncertain instead of a falsely-confident HGVS string.
"""

import subprocess
from pathlib import Path

from cyvcf2 import VCF

from . import tool_budget

# INFO/ANN field order, per SnpEff's documented specification.
_ANN_FIELDS = [
    "allele", "annotation", "annotation_impact", "gene_name", "gene_id",
    "feature_type", "feature_id", "transcript_biotype", "rank", "hgvs_c",
    "hgvs_p", "cdna_pos", "cds_pos", "aa_pos", "distance", "errors_warnings_info",
]


class SnpEffError(Exception):
    pass


def _parse_ann_entry(entry: str) -> dict:
    parts = entry.split("|")
    record = {}
    for i, name in enumerate(_ANN_FIELDS):
        record[name] = parts[i] if i < len(parts) and parts[i] != "" else None
    return record


def run_snpeff(input_vcf: str, output_vcf: str, snpeff_jar: str, genome_db: str, data_dir: str) -> None:
    if not Path(snpeff_jar).exists():
        raise SnpEffError(
            f"SnpEff jar not found at {snpeff_jar}. Run scripts/download_references.sh to provision it."
        )
    cmd = [
        "java", "-Xmx4g", "-jar", snpeff_jar,
        # -noLog: SnpEff otherwise reports usage statistics to its own server;
        # analyses must stay local.
        "-noStats", "-noLog", "-canon", "-dataDir", data_dir, genome_db, input_vcf,
    ]
    try:
        with open(output_vcf, "w") as out:
            result = subprocess.run(
                cmd, stdout=out, stderr=subprocess.PIPE, text=True, timeout=tool_budget.remaining(),
            )
    except subprocess.TimeoutExpired:
        raise SnpEffError("SnpEff timed out (analysis tool budget exhausted)") from None
    if result.returncode != 0:
        raise SnpEffError(f"SnpEff failed: {result.stderr.strip()[:2000]}")


def extract_annotations(annotated_vcf: str) -> dict:
    """Returns {variant_key: annotation_dict} keyed by chrom:pos:ref:alt."""
    annotations = {}
    for record in VCF(annotated_vcf):
        alt = record.ALT[0] if record.ALT else "."
        key = f"{record.CHROM}:{record.POS}:{record.REF}:{alt}"
        raw = record.INFO.get("ANN")
        if not raw:
            annotations[key] = _empty_annotation(is_symbolic=alt.startswith("<"))
            continue

        entries = [_parse_ann_entry(e) for e in raw.split(",") if e]
        primary = entries[0]
        warnings = sorted({e["errors_warnings_info"] for e in entries if e.get("errors_warnings_info")})
        is_symbolic = alt.startswith("<") and alt.endswith(">")

        annotations[key] = {
            "consequence_class": "structural" if is_symbolic else "sequence_level",
            "consequence": primary.get("annotation"),
            "impact": primary.get("annotation_impact"),
            # Never fabricate a protein-change string for a large structural deletion.
            "hgvs_c": None if is_symbolic else primary.get("hgvs_c"),
            "hgvs_p": None if is_symbolic else primary.get("hgvs_p"),
            "transcript_id": primary.get("feature_id"),
            "gene": primary.get("gene_name"),
            "gene_id": primary.get("gene_id"),
            "all_transcripts": entries,
            "warnings": warnings,
        }
    return annotations


def _empty_annotation(is_symbolic: bool) -> dict:
    return {
        "consequence_class": "structural" if is_symbolic else "sequence_level",
        "consequence": None,
        "impact": None,
        "hgvs_c": None,
        "hgvs_p": None,
        "transcript_id": None,
        "gene": None,
        "gene_id": None,
        "all_transcripts": [],
        "warnings": ["No SnpEff ANN field produced for this record"],
    }
