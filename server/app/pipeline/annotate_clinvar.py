"""ClinVar clinical-significance annotation via a locally-downloaded ClinVar
VCF. No live API call.

Both sides must be normalized identically (bcftools norm) before this join, or
legitimate matches are silently missed. Symbolic/complex ALT records will
essentially never match ClinVar's sequence-resolved entries, so those return an
explicit match_level "none" with a reason -- a missing field reads as "not
checked", while an explicit none reads honestly as "checked, no match possible".
"""

import subprocess
from pathlib import Path

from cyvcf2 import VCF

from . import tool_budget
from .normalize import ensure_contig_headers


class ClinVarError(Exception):
    pass


def _run(cmd: list[str], what: str, **kwargs) -> subprocess.CompletedProcess:
    """subprocess.run within the analysis's tool budget; an overrun is a
    ClinVarError like any other failure of this stage."""
    try:
        return subprocess.run(cmd, timeout=tool_budget.remaining(), **kwargs)
    except subprocess.TimeoutExpired:
        raise ClinVarError(f"{what} timed out (analysis tool budget exhausted)") from None


# ClinVar's own review-status -> gold-star mapping, so users see the confidence
# of the ClinVar assertion itself, not just the assertion.
_REVIEW_STARS = {
    "practice_guideline": 4,
    "reviewed_by_expert_panel": 3,
    "criteria_provided,_multiple_submitters,_no_conflicts": 2,
    "criteria_provided,_conflicting_classifications": 1,
    "criteria_provided,_conflicting_interpretations": 1,
    "criteria_provided,_single_submitter": 1,
    "no_assertion_criteria_provided": 0,
    "no_classification_provided": 0,
    "no_classifications_from_unflagged_records": 0,
}


def review_status_to_stars(status: str | None) -> int | None:
    if not status:
        return None
    return _REVIEW_STARS.get(status.strip().lower().replace(" ", "_"))


def _bgzip_and_index(vcf_path: str, reference_fasta: str) -> str:
    """bcftools annotate needs a bgzip-compressed, indexed input to do the
    coordinate join, so compress and index a working copy.

    tabix requires coordinate-sorted input, but nothing upstream (SnpEff,
    normalization) guarantees that -- so sort defensively here rather than
    trusting the caller's ordering. `bcftools sort` also requires every
    record's CHROM to be declared in the file's own header: SnpEff (run just
    before this, on normalize.py's output) does not reliably carry through
    the ##contig declarations normalize.py already ensured were present, so
    reconcile them again here, on whatever file this call actually receives,
    rather than trusting an upstream tool this module doesn't control.
    """
    reconciled = ensure_contig_headers(vcf_path, vcf_path, reference_fasta)

    sorted_path = f"{reconciled}.sorted.vcf"
    result = _run(
        ["bcftools", "sort", "-O", "v", "-o", sorted_path, reconciled], "bcftools sort",
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise ClinVarError(f"bcftools sort failed: {result.stderr.strip()[:500]}")

    gz_path = f"{sorted_path}.gz"
    with open(gz_path, "wb") as out:
        result = _run(["bgzip", "-c", sorted_path], "bgzip", stdout=out, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise ClinVarError(f"bgzip failed: {result.stderr.decode(errors='replace').strip()[:500]}")
    result = _run(["tabix", "-f", "-p", "vcf", gz_path], "tabix", capture_output=True, text=True)
    if result.returncode != 0:
        raise ClinVarError(f"tabix failed: {result.stderr.strip()[:500]}")
    return gz_path


def annotate_with_clinvar(input_vcf: str, output_vcf: str, clinvar_vcf: str, reference_fasta: str) -> None:
    if not Path(clinvar_vcf).exists():
        raise ClinVarError(
            f"ClinVar VCF not found at {clinvar_vcf}. Run scripts/download_references.sh to provision it."
        )
    indexed_input = _bgzip_and_index(input_vcf, reference_fasta)
    result = _run(
        [
            "bcftools", "annotate",
            "-a", clinvar_vcf,
            # CLNSIGCONF carries the breakdown of conflicting submissions, ONC is
            # ClinVar's somatic-oncogenicity classification (distinct from the
            # germline CLNSIG), and AF_* give population frequencies.
            "-c", ("ID,INFO/CLNSIG,INFO/CLNDN,INFO/CLNREVSTAT,INFO/CLNSIGCONF,INFO/ONC,"
                   "INFO/AF_ESP,INFO/AF_EXAC,INFO/AF_TGP"),
            "-O", "v", "-o", output_vcf, indexed_input,
        ],
        "bcftools annotate (ClinVar)",
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise ClinVarError(f"bcftools annotate (ClinVar) failed: {result.stderr.strip()[:2000]}")


def _clean(value):
    if isinstance(value, str):
        return value.replace("_", " ").replace("|", "; ")
    return value


def _population_af(record) -> tuple[float | None, str | None]:
    """Highest population AF across ClinVar's provided cohorts.

    NOT gnomAD: these fields cover only variants present in ClinVar, so a missing
    value means "not listed here", never "rare".
    """
    sources = {"AF_EXAC": "ExAC", "AF_TGP": "1000 Genomes", "AF_ESP": "GO-ESP"}
    best_af, best_source = None, None
    for field, label in sources.items():
        value = record.INFO.get(field)
        if value is None:
            continue
        try:
            af = float(value)
        except (TypeError, ValueError):
            continue
        if best_af is None or af > best_af:
            best_af, best_source = af, label
    return best_af, best_source


def extract_clinvar(annotated_vcf: str) -> dict:
    """Returns {variant_key: clinvar_dict} keyed by chrom:pos:ref:alt."""
    out = {}
    for record in VCF(annotated_vcf):
        alt = record.ALT[0] if record.ALT else "."
        key = f"{record.CHROM}:{record.POS}:{record.REF}:{alt}"
        is_symbolic = alt.startswith("<") and alt.endswith(">")

        clnsig = record.INFO.get("CLNSIG")
        oncogenicity = record.INFO.get("ONC")
        if clnsig is None and oncogenicity is None:
            out[key] = {
                "match_level": "none",
                "rsid": None,
                "clnsig": None,
                "clndn": None,
                "review_stars": None,
                "review_status": None,
                "conflicting_breakdown": None,
                "oncogenicity": None,
                "population_af": None,
                "population_af_source": None,
                "reason": (
                    "symbolic_or_complex_allele_not_directly_matchable" if is_symbolic
                    else "no_clinvar_record_at_this_normalized_coordinate"
                ),
            }
            continue

        review_status = record.INFO.get("CLNREVSTAT")
        stars = review_status_to_stars(review_status)
        conflicting = record.INFO.get("CLNSIGCONF")
        population_af, population_source = _population_af(record)
        clnsig_text = _clean(clnsig)

        out[key] = {
            "match_level": "exact",
            "rsid": record.ID,
            "clnsig": clnsig_text,
            "clndn": _clean(record.INFO.get("CLNDN")),
            "review_stars": stars,
            "review_status": _clean(review_status),
            # A "Benign" call from one uncriteria'd submitter is far weaker evidence
            # than a 3-star expert-panel review; both the star count and any
            # conflicting-submission breakdown are surfaced rather than hidden.
            "is_conflicting": bool(conflicting) or (
                isinstance(clnsig_text, str) and "conflict" in clnsig_text.lower()
            ),
            "conflicting_breakdown": _clean(conflicting),
            "is_low_confidence_assertion": stars is not None and stars <= 1,
            "oncogenicity": _clean(oncogenicity),
            "population_af": population_af,
            "population_af_source": population_source,
            "reason": None,
        }
    return out
