"""Structural validation on ingest (spec §8).

Fails fast with a specific message rather than partially processing a malformed
file. Each check names what was expected, what was found, and why it matters, so
the caller can fix the file rather than guess.
"""

from cyvcf2 import VCF

# INFO fields each validated adapter genuinely depends on. Missing ones mean the
# adapter cannot compute VAF/depth correctly, which is worth failing on rather
# than silently producing zeros.
REQUIRED_INFO_BY_ADAPTER = {
    "vardict": ["AF", "DP", "VD"],
}


class StructuralValidationError(Exception):
    def __init__(self, message: str, detail: dict | None = None):
        self.detail = detail or {}
        super().__init__(message)


def validate_vcf(path: str, adapter_name: str | None = None) -> dict:
    """Structural checks before any analysis. Returns a report of what passed;
    raises StructuralValidationError on a hard failure.

    Runs BEFORE parse.parse_vcf: cyvcf2 rejects a broken header (e.g. no #CHROM
    line) with a bare Exception, which has to surface as the specific
    structural error below rather than as a 500. The adapter is only known
    after parsing, so its required-INFO check can follow separately via
    check_required_info()."""
    try:
        vcf = VCF(path)
    except Exception as exc:
        raise StructuralValidationError(
            "This file could not be opened as a VCF.",
            {"parser_error": str(exc)[:400]},
        )

    raw_header = vcf.raw_header
    checks: list[dict] = []

    if "##fileformat=" not in raw_header:
        raise StructuralValidationError(
            "VCF header is missing the required ##fileformat line.",
            {"expected": "##fileformat=VCFv4.x as the first header line"},
        )
    checks.append({"check": "fileformat_header", "status": "pass"})

    if "#CHROM" not in raw_header:
        raise StructuralValidationError(
            "VCF header is missing the required #CHROM column line.",
            {"expected": "#CHROM POS ID REF ALT QUAL FILTER INFO [FORMAT sample...]"},
        )
    checks.append({"check": "chrom_header_line", "status": "pass"})

    contigs = list(vcf.seqnames)
    checks.append({
        "check": "contigs_declared",
        "status": "pass" if contigs else "warn",
        "detail": f"{len(contigs)} contig(s) declared" if contigs
                  else "no ##contig lines; coordinate sanity checks are limited",
    })

    samples = list(vcf.samples)
    checks.append({
        "check": "sample_columns",
        "status": "pass" if samples else "warn",
        "detail": (f"{len(samples)} sample column(s): {samples}" if samples
                   else "sites-only VCF (no sample columns); only INFO-level fields are available"),
    })

    info_ids = {rec["ID"] for rec in vcf.header_iter() if rec.type == "INFO" and "ID" in rec.info()}
    report = {"checks": checks, "contigs": contigs, "samples": samples,
              "declared_info_fields": sorted(info_ids)}
    if adapter_name:
        check_required_info(report, adapter_name)
    return report


def check_required_info(report: dict, adapter_name: str) -> None:
    """The caller-specific half of validation: fails if the header lacks an INFO
    field the detected adapter depends on, else records the check in `report`."""
    required = REQUIRED_INFO_BY_ADAPTER.get(adapter_name or "", [])
    missing_info = [f for f in required if f not in report["declared_info_fields"]]
    if missing_info:
        raise StructuralValidationError(
            f"This file is identified as {adapter_name} output but its header does not declare "
            f"required INFO field(s): {', '.join(missing_info)}.",
            {"adapter": adapter_name, "missing_info_fields": missing_info,
             "declared_info_fields": report["declared_info_fields"][:60]},
        )
    if required:
        report["checks"].append({"check": f"required_info_fields_for_{adapter_name}", "status": "pass",
                                 "detail": f"present: {', '.join(required)}"})


def check_contig_consistency(variants, build: str, chrom_lengths: dict) -> dict:
    """Confirms every variant position falls inside its contig's length for the
    declared build. A position past the end is proof of a build/contig mismatch."""
    lengths = chrom_lengths.get(build, {})
    violations = []
    for v in variants:
        chrom = v.chrom.replace("chr", "")
        max_len = lengths.get(chrom)
        if max_len is not None and v.pos > max_len:
            violations.append({
                "locus": f"{v.chrom}:{v.pos}",
                "gene": v.gene,
                "contig_length_in_build": max_len,
                "overshoot_bp": v.pos - max_len,
            })
    return {
        "status": "pass" if not violations else "fail",
        "build_checked": build,
        "violation_count": len(violations),
        "violations": violations[:10],
        "detail": (
            f"all positions fall within {build} contig bounds" if not violations else
            f"{len(violations)} position(s) exceed their contig's length in {build} -- the declared "
            f"build is inconsistent with these coordinates"
        ),
    }
