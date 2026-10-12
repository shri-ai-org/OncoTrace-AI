"""Regression suite (spec §10).

S5 is a negative control: a real VarDict panel VCF with zero true somatic
positives and several known artifact classes. The synthetic positive control
proves the pipeline also promotes a genuine hotspot -- a pipeline validated only
against one bad file isn't validated.

Tests that need a reference database are skipped (not silently passed) when it
isn't provisioned, so an unprovisioned environment can't look like a passing one.
"""

from pathlib import Path

import pytest

from app.core import config
from app.pipeline import parse, qc_flags, tiers
from app.pipeline.build_detection import corroborate_build
from app.services.analysis_service import analyze_vcf

FIXTURES = Path(__file__).parent / "fixtures"
S5 = FIXTURES / "S5.panel.annotated.vcf"
POSITIVE_CONTROL = FIXTURES / "positive_control_GRCh38.vcf"

CONTAMINANT_MOTIF = "GGTCGCCGTATCATT"

needs_clinvar = pytest.mark.skipif(
    not config.clinvar_ready("GRCh38"),
    reason="ClinVar GRCh38 not provisioned; run scripts/download_references.sh clinvar-grch38",
)
needs_civic = pytest.mark.skipif(
    not config.CIVIC_CACHE.exists(),
    reason="CIViC cache not provisioned; run scripts/download_references.sh civic",
)


@pytest.fixture(scope="module")
def s5_variants():
    variants, meta = parse.parse_vcf(str(S5))
    return variants, meta


@pytest.fixture(scope="module")
def s5_qc(s5_variants):
    variants, _ = s5_variants
    return qc_flags.evaluate(variants, "GRCh38")


@pytest.fixture(scope="module")
def s5_analysis():
    return analyze_vcf(str(S5), "S5.panel.annotated.vcf", "GRCh38")


# --------------------------------------------------------------- §10 assertions

def test_contamination_cluster_all_five_flagged(s5_variants, s5_qc):
    """Five indel/complex calls on five unrelated chromosomes share an inserted
    motif -- adapter/template-switch contamination."""
    variants, _ = s5_variants
    flagged = [
        (variants[i].gene, variants[i].chrom, variants[i].pos, variants[i].filter)
        for i, res in s5_qc["per_variant"].items()
        if "artifact_contamination_candidate" in res["flag_names"]
    ]
    assert len(flagged) == 5, f"expected 5 contamination candidates, got {flagged}"
    # Five distinct chromosomes -- recurrence at unrelated loci is the signal.
    assert len({chrom for _, chrom, _, _ in flagged}) == 5
    assert {g for g, _, _, _ in flagged} == {"PHOX2B", "FGFR1", "C11ORF95", "GRIN2A", "DNM2"}


def test_contamination_flagged_even_when_caller_said_pass(s5_variants, s5_qc):
    """The caller's own PASS must not be trusted to mean 'not a contaminant' --
    one member of this cluster is FILTER=PASS."""
    variants, _ = s5_variants
    pass_flagged = [
        variants[i].gene
        for i, res in s5_qc["per_variant"].items()
        if "artifact_contamination_candidate" in res["flag_names"] and variants[i].filter == ["PASS"]
    ]
    assert pass_flagged == ["C11ORF95"], f"expected the PASS contaminant to be flagged, got {pass_flagged}"


def test_reported_motif_is_the_real_shared_sequence(s5_qc):
    motifs = s5_qc["summary"]["contamination_motifs"]
    assert any(CONTAMINANT_MOTIF in m for m in motifs), (
        f"expected a reported motif containing {CONTAMINANT_MOTIF}, got {motifs}"
    )


def test_twelve_microsatellite_indels_flagged(s5_variants, s5_qc):
    """Twelve records sit in homopolymer/microsatellite runs (VarDict MSI 8-18);
    the caller filter-flagged only one of them."""
    variants, _ = s5_variants
    assert s5_qc["summary"]["microsatellite_by_msi_field"] == 12

    caller_flagged = sum(
        1 for v in variants
        if v.msi is not None and v.msi >= qc_flags.MSI_FLAG_MIN and not v.filter_pass
    )
    assert caller_flagged < 12, (
        "the point of this stage is that the caller under-flags these; if the caller now flags "
        "all 12, this test needs rethinking"
    )


@needs_clinvar
@needs_civic
def test_microsatellite_variants_excluded_from_tier_1(s5_analysis):
    for v in s5_analysis["variants"]:
        if v["msi"] is not None and v["msi"] >= qc_flags.MSI_FLAG_MIN:
            assert v["tier"]["tier"] != tiers.TIER_1, (
                f"{v['gene']} {v['chrom']}:{v['pos']} has MSI {v['msi']} but reached Tier 1"
            )


def test_hla_and_ighj_records_flagged_hypervariable(s5_variants, s5_qc):
    """HLA-A, HLA-C and IGHJ are germline hypervariable / rearranging loci, not
    somatic signal."""
    variants, _ = s5_variants
    expected = {
        i for i, v in enumerate(variants)
        if (v.gene or "") in ("HLA-A", "HLA-C", "IGHJ")
    }
    assert len(expected) == 12, f"fixture should contain 12 HLA/IGHJ records, found {len(expected)}"
    for i in expected:
        assert "hypervariable_region" in s5_qc["per_variant"][i]["flag_names"], (
            f"{variants[i].gene} {variants[i].chrom}:{variants[i].pos} not flagged hypervariable"
        )


@needs_clinvar
@needs_civic
def test_hypervariable_variants_excluded_from_tier_1(s5_analysis):
    for v in s5_analysis["variants"]:
        if (v["gene"] or "") in ("HLA-A", "HLA-C", "IGHJ"):
            assert v["tier"]["tier"] != tiers.TIER_1


def test_duplicate_klf4_deletion_collapses_to_one_event(s5_variants, s5_qc):
    """The same 1101bp deletion is reported twice, 3bp apart."""
    variants, _ = s5_variants
    klf4 = [i for i, v in enumerate(variants) if v.gene == "KLF4"]
    assert len(klf4) == 2

    duplicates = [i for i in klf4 if "duplicate_representation" in s5_qc["per_variant"][i]["flag_names"]]
    retained = [i for i in klf4 if s5_qc["per_variant"][i].get("collapsed_duplicates")]
    assert len(duplicates) == 1, "exactly one of the two KLF4 records should be marked duplicate"
    assert len(retained) == 1, "the surviving record should carry the absorbed evidence"

    # Evidence from the superseded record is preserved, not silently deleted.
    absorbed = s5_qc["per_variant"][retained[0]]["collapsed_duplicates"]["absorbed_records"]
    assert len(absorbed) == 1
    assert absorbed[0]["vaf"] is not None


@needs_clinvar
def test_braf_and_egfr_are_not_matched_to_hotspots(s5_analysis):
    """Regression guard against false hotspot matching: neither of these S5 calls
    is BRAF V600E or an EGFR TKI-sensitizing variant."""
    by_gene = {v["gene"]: v for v in s5_analysis["variants"] if v["gene"] in ("BRAF", "EGFR")}

    braf = by_gene["BRAF"]
    assert braf["pos"] == 140798272
    assert braf["pos"] != 140753336, "140753336 is V600E; this call is elsewhere in BRAF"
    assert braf["tier"]["tier"] != tiers.TIER_1

    egfr = by_gene["EGFR"]
    assert egfr["pos"] == 55167263
    # Not L858R (55191822), not T790M (55181378), not in the exon-19 deletion window.
    assert egfr["pos"] not in (55191822, 55181378)
    assert not (55174722 <= egfr["pos"] <= 55174820), "exon 19 deletion window"
    assert egfr["tier"]["tier"] != tiers.TIER_1


@needs_clinvar
@needs_civic
def test_s5_final_tier_1_is_zero(s5_analysis):
    """The headline assertion: this sample contains no actionable somatic finding."""
    counts = s5_analysis["tier_summary"]["counts"]
    assert counts[tiers.TIER_1] == 0, (
        "S5 is a negative control; any Tier 1 call is a false positive. "
        f"Full counts: {counts}"
    )


@needs_clinvar
def test_s5_has_no_pathogenic_clinvar_calls(s5_analysis):
    pathogenic = [
        v["gene"] for v in s5_analysis["variants"]
        if "pathogenic" in ((v["clinvar"].get("clnsig") or "").lower())
        and "conflicting" not in ((v["clinvar"].get("clnsig") or "").lower())
    ]
    assert pathogenic == [], f"expected no pathogenic ClinVar calls in S5, got {pathogenic}"


def test_s5_provenance_surfaces_the_missing_panel_bed(s5_analysis):
    """The panel BED named in the header was never located -- that should appear
    as a checklist item without anyone reading the header by hand."""
    checklist = s5_analysis["meta"]["provenance"]["checklist"]
    assert any("panel_fixed.bed" in item for item in checklist), checklist
    assert any("panel footprint" in item for item in checklist)


def test_s5_panel_density_is_null_without_a_bed(monkeypatch, tmp_path):
    # Its own run with every footprint source pointed at nothing: a machine with
    # gene spans provisioned would otherwise (correctly) produce an estimate.
    missing = tmp_path / "not-provisioned.bed"
    monkeypatch.setattr(config, "PANEL_BED", missing)
    monkeypatch.setattr(config, "GENE_SPANS_BY_BUILD", {"GRCh37": missing, "GRCh38": missing})
    analysis = analyze_vcf(str(S5), "S5.panel.annotated.vcf", "GRCh38")
    assert analysis["panel_mutation_density"] is None
    assert analysis["meta"]["panel_footprint_mb"] is None


def test_build_corroboration_confirms_grch38_for_s5(s5_variants):
    """BRAF and MYC coordinates independently corroborate the declared build."""
    variants, _ = s5_variants
    consistent = corroborate_build(variants, "GRCh38")
    assert consistent["status"] == "consistent"
    assert consistent["checked_variant_count"] >= 2

    conflict = corroborate_build(variants, "GRCh37")
    assert conflict["status"] == "conflict"
    assert "Re-confirm" in conflict["warning"]
    assert {c["gene"] for c in conflict["conflicting"]} >= {"BRAF", "MYC"}


@needs_clinvar
@needs_civic
def test_every_stage_reports_a_recognized_status(s5_analysis):
    allowed = {"ran", "skipped_missing_input", "skipped_unsupported", "failed"}
    for name, stage in s5_analysis["meta"]["stages"].items():
        assert stage["status"] in allowed, (name, stage)


@needs_clinvar
@needs_civic
def test_no_bare_risk_score_is_emitted(s5_analysis):
    """A 0-100 scalar must not be the headline. The tier breakdown and the
    formula for any single number must travel with it."""
    assert "prioritization_score" not in s5_analysis
    summary = s5_analysis["tier_summary"]
    assert "counts" in summary
    assert "review_priority_formula" in summary
    assert "review_priority_count" in summary
    # The formula must actually describe the number that was produced.
    counts = summary["counts"]
    assert summary["review_priority_count"] == 2 * counts[tiers.TIER_1] + counts[tiers.TIER_2]


# ----------------------------------------------------- positive control (§10)

@pytest.fixture(scope="module")
def positive_analysis():
    return analyze_vcf(str(POSITIVE_CONTROL), "positive_control_GRCh38.vcf", None)


@needs_clinvar
def test_positive_control_promotes_real_hotspots_to_tier_1(positive_analysis):
    """A pipeline that only proves negatives isn't validated -- these are real
    GRCh38 hotspots at plausible tumor-only allele fractions."""
    counts = positive_analysis["tier_summary"]["counts"]
    assert counts[tiers.TIER_1] >= 2, f"expected real hotspots in Tier 1, got {counts}"

    by_gene = {v["gene"]: v for v in positive_analysis["variants"]}
    for gene in ("KRAS", "PIK3CA"):
        assert by_gene[gene]["tier"]["tier"] == tiers.TIER_1, (
            f"{gene} should be Tier 1: {by_gene[gene]['tier']}"
        )
        assert by_gene[gene]["clinvar"]["match_level"] == "exact"


@needs_clinvar
def test_braf_v600e_reaches_tier_1_via_somatic_oncogenicity(positive_analysis):
    """BRAF V600E's ClinVar GERMLINE classification is 'Conflicting' (germline
    V600E causes a developmental syndrome), so promotion must come from the
    somatic oncogenicity assertion rather than the germline one."""
    braf = next(v for v in positive_analysis["variants"] if v["gene"] == "BRAF")
    assert braf["pos"] == 140753336
    assert braf["tier"]["tier"] == tiers.TIER_1
    assert "oncogenic" in (braf["clinvar"].get("oncogenicity") or "").lower()
    assert any("oncogenicity" in r.lower() for r in braf["tier"]["reasons"])


@needs_clinvar
def test_positive_control_build_detected_from_header(positive_analysis):
    meta = positive_analysis["meta"]
    assert meta["reference_build"] == "GRCh38"
    assert meta["reference_build_source"] == "vcf_header"
    assert meta["reference_build_confirmed"] is True
    assert meta["reference_build_corroboration"]["status"] == "consistent"


@needs_clinvar
def test_positive_control_has_no_artifact_flags(positive_analysis):
    """Clean QC is part of what makes this a positive control -- if these start
    getting flagged, the QC layer has become over-eager."""
    for v in positive_analysis["variants"]:
        assert "artifact_contamination_candidate" not in v["qc"]["flag_names"]
        assert v["qc"]["confidence_downgraded"] is False, (v["gene"], v["qc"]["flags"])
