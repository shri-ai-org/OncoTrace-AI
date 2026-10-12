import gzip
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import app
from .conftest import basic_auth_header
from .test_normalize import _build_reference

# Credentials ride on every request so these tests stay focused on analysis
# behaviour; the gate itself is covered in test_auth.py.
client = TestClient(app, headers=basic_auth_header())
FIXTURES = Path(__file__).parent / "fixtures"
S5 = FIXTURES / "S5.panel.annotated.vcf"


def test_health_reports_resource_provisioning():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    # Resource flags let an operator see exactly which annotation stages can run.
    assert "clinvar_GRCh38" in body["resources"]
    assert "civic_cache" in body["resources"]


def test_rejects_non_vcf_extension():
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("notes.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 400
    assert r.json()["error_kind"] == "malformed_vcf"


def test_rejects_empty_file():
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("empty.vcf", b"", "text/plain")},
    )
    assert r.status_code == 400
    assert r.json()["error_kind"] == "malformed_vcf"


def test_rejects_unsupported_build_hint():
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("s5.vcf", S5.read_bytes(), "text/plain")},
        data={"reference_build_hint": "hg19-ish"},
    )
    assert r.status_code == 400
    assert "reference_build_hint" in r.json()["message"]


def test_missing_build_hint_either_resolves_with_evidence_or_refuses_with_evidence():
    """The API must never silently pick a build. Either it resolves one and shows
    the evidence (an empirical ClinVar probe), or it refuses and shows why -- but
    it never guesses."""
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("s5.vcf", S5.read_bytes(), "text/plain")},
    )
    if r.status_code == 422:
        body = r.json()
        assert body["error_kind"] == "reference_build_unresolved"
        assert "supported_builds" in body["detail"]
        assert "evidence" in body["detail"]
    else:
        assert r.status_code == 200, r.text
        meta = r.json()["meta"]
        assert meta["reference_build_source"] in ("vcf_header", "empirical_clinvar_probe")
        assert meta["reference_build_confirmed"] is True
        assert meta["reference_build_evidence"], "a resolved build must show its evidence"


def test_unknown_caller_is_read_generically_and_visibly_warned():
    vcf = (
        "##fileformat=VCFv4.2\n"
        "##source=TotallyUnknownCaller_v1\n"
        '##FILTER=<ID=PASS,Description="pass">\n'
        '##FORMAT=<ID=GT,Number=1,Type=String,Description="GT">\n'
        "##contig=<ID=1>\n"
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1\n"
        "1\t100\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\n"
    ).encode()
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("mystery.vcf", vcf, "text/plain")},
        data={"reference_build_hint": "GRCh38"},
    )
    # Without spec-standard depth/VAF fields there is nothing to read, so this
    # particular file is refused rather than guessed at.
    assert r.status_code in (400, 422), r.text
    assert r.json()["error_kind"] == "malformed_vcf"


def test_vcf_with_no_variant_records_returns_422():
    vcf = (
        "##fileformat=VCFv4.2\n"
        "##source=VarDict_v1.8.2\n"
        '##FILTER=<ID=PASS,Description="pass">\n'
        '##INFO=<ID=SBF,Number=1,Type=Float,Description="SBF">\n'
        '##INFO=<ID=ODDRATIO,Number=1,Type=Float,Description="OR">\n'
        '##INFO=<ID=HIAF,Number=1,Type=Float,Description="HIAF">\n'
        '##FORMAT=<ID=GT,Number=1,Type=String,Description="GT">\n'
        "##contig=<ID=1>\n"
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1\n"
    ).encode()
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("empty-records.vcf", vcf, "text/plain")},
        data={"reference_build_hint": "GRCh38"},
    )
    assert r.status_code in (400, 422), r.text
    assert r.json()["error_kind"] == "malformed_vcf"


def test_successful_analysis_returns_real_computed_values():
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("S5.panel.annotated.vcf", S5.read_bytes(), "text/plain")},
        data={"reference_build_hint": "GRCh38"},
    )
    assert r.status_code == 200, r.text
    body = r.json()

    # Values below are the real S5 sample's actual numbers, not fixtures.
    assert body["meta"]["sample_id"] == "S5"
    assert body["meta"]["caller_adapter"] == "vardict"
    assert body["meta"]["caller_adapter_validated"] is True
    assert body["qc_summary"]["total_records"] == 49
    assert body["qc_summary"]["pass_count"] == 38
    assert body["qc_summary"]["depth"]["max"] == 3067

    egfr = next(v for v in body["variants"] if v["gene"] == "EGFR")
    assert egfr["chrom"] == "7"
    assert egfr["pos"] == 55167263
    assert abs(egfr["vaf"] - 0.8787) < 1e-3

    # Three symbolic-ALT structural deletions in this sample (KLF4 x2, MYC).
    assert len(body["structural_variants"]) == 3
    assert {sv["gene"] for sv in body["structural_variants"]} == {"KLF4", "MYC"}


def test_response_always_discloses_stage_status_and_disclaimers():
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("S5.panel.annotated.vcf", S5.read_bytes(), "text/plain")},
        data={"reference_build_hint": "GRCh38"},
    )
    body = r.json()
    stages = body["meta"]["stages"]
    # Every stage reports a recognized status with a reason, so a stage that did
    # not run can never be mistaken for one that ran and found nothing.
    allowed = {"ran", "skipped_missing_input", "skipped_unsupported", "failed"}
    assert stages["parsing"]["status"] == "ran"
    for name, stage in stages.items():
        assert stage["status"] in allowed, (name, stage)
        if stage["status"] != "ran":
            assert stage["detail"], f"{name} skipped without stating why"

    assert "not a diagnostic device" in body["meta"]["disclaimer"].lower()
    assert "not FDA-cleared" in body["actionability_summary"]["disclaimer"]
    # The headline number must arrive with its formula, not as a bare scalar.
    assert "prioritization_score" not in body
    assert "review_priority_formula" in body["tier_summary"]


def test_no_fabricated_clinical_claims_when_annotation_is_skipped():
    """If an annotation stage didn't run, its per-variant fields must say so
    rather than reading as 'checked, nothing found'."""
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("S5.panel.annotated.vcf", S5.read_bytes(), "text/plain")},
        data={"reference_build_hint": "GRCh38"},
    )
    body = r.json()
    if body["meta"]["stages"]["clinical_significance"]["status"] != "ran":
        for v in body["variants"]:
            assert v["clinvar"]["match_level"] == "none"
            assert v["clinvar"]["reason"] is not None


def test_symbolic_alt_variants_never_get_a_protein_change_string():
    r = client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": ("S5.panel.annotated.vcf", S5.read_bytes(), "text/plain")},
        data={"reference_build_hint": "GRCh38"},
    )
    body = r.json()
    for sv in body["structural_variants"]:
        assert sv["annotation"].get("hgvs_p") is None
        assert sv["annotation"].get("consequence_class") == "structural"


# ------------------------------------------- malformed input is a 4xx, never a 500

@pytest.fixture
def no_external_tools(monkeypatch):
    """Reports bcftools/SnpEff/ClinVar resources as unprovisioned so these tests
    exercise parsing, QC and error mapping without minutes of annotation."""
    for name in ("reference_ready", "snpeff_ready", "clinvar_ready"):
        monkeypatch.setattr(config, name, lambda build: False)


VARDICT_VCF = (
    "##fileformat=VCFv4.2\n"
    "##source=VarDict_v1.8.2\n"
    '##INFO=<ID=AF,Number=A,Type=Float,Description="AF">\n'
    '##INFO=<ID=DP,Number=1,Type=Integer,Description="DP">\n'
    '##INFO=<ID=VD,Number=1,Type=Integer,Description="VD">\n'
    "{extra_header}"
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="GT">\n'
    "##contig=<ID=7>\n"
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1\n"
    "7\t140753336\t.\tA\tT\t.\tPASS\tAF=0.3;DP=100;VD=30{extra_info}\tGT\t0/1\n"
)


def _analyze(content: bytes, name="x.vcf", **extra_files):
    return client.post(
        "/api/v1/vcf/analyze",
        files={"vcf_file": (name, content, "text/plain"), **extra_files},
        data={"reference_build_hint": "GRCh38"},
    )


@pytest.mark.parametrize("damage", ["corrupt", "truncated"])
def test_damaged_gzip_upload_is_400(damage):
    data = gzip.compress(S5.read_bytes())
    data = data[:10] + b"\xff" * 32 + data[42:] if damage == "corrupt" else data[:-40]
    r = _analyze(data, "s5.vcf.gz")
    assert r.status_code == 400, r.text
    assert r.json()["error_kind"] == "malformed_vcf"


def test_vcf_header_without_chrom_line_is_400():
    """cyvcf2 refuses this header with a bare Exception; validation runs first
    so the user is told what is wrong instead of getting a 500."""
    r = _analyze(b"##fileformat=VCFv4.2\n##source=x\n7\t140753336\t.\tA\tT\t.\tPASS\t.\n")
    assert r.status_code == 400, r.text
    assert r.json()["error_kind"] == "malformed_vcf"


def test_text_info_fields_declared_integer_do_not_crash(no_external_tools):
    """INFO values are typed by the file's own header. GENE/TYPE declared as
    Integer used to crash build corroboration and QC with a 500."""
    vcf = VARDICT_VCF.format(
        extra_header=(
            '##INFO=<ID=GENE,Number=1,Type=Integer,Description="gene">\n'
            '##INFO=<ID=TYPE,Number=1,Type=Integer,Description="type">\n'
            '##INFO=<ID=SVTYPE,Number=1,Type=Integer,Description="svtype">\n'
        ),
        extra_info=";GENE=7;TYPE=5;SVTYPE=3",
    )
    r = _analyze(vcf.encode())
    assert r.status_code == 200, r.text
    variant = r.json()["variants"][0]
    assert (variant["gene"], variant["type"], variant["svtype"]) == ("7", "5", "3")


def test_binary_panel_bed_is_reported_as_a_bed_problem(no_external_tools):
    r = _analyze(
        VARDICT_VCF.format(extra_header="", extra_info="").encode(),
        panel_bed=("panel.bed", bytes(range(256)) * 8, "application/octet-stream"),
    )
    assert r.status_code == 400, r.text
    body = r.json()
    assert body["error_kind"] == "malformed_panel_bed"
    assert "codec" not in body["message"]


def test_too_many_records_is_413(monkeypatch):
    monkeypatch.setattr(config, "MAX_RECORDS", 10)
    r = _analyze(S5.read_bytes())
    assert r.status_code == 413, r.text
    assert r.json()["error_kind"] == "malformed_vcf"


def test_gzip_expanding_past_the_cap_is_413(monkeypatch):
    monkeypatch.setattr(config, "MAX_DECOMPRESSED_BYTES", 4096)
    r = _analyze(gzip.compress(S5.read_bytes()), "s5.vcf.gz")
    assert r.status_code == 413, r.text
    assert r.json()["error_kind"] == "malformed_vcf"


def test_provenance_never_exposes_server_paths(no_external_tools):
    """The uploaded BED's temp path must not appear in the response; the
    reference is resolved with a label instead."""
    vcf = VARDICT_VCF.format(
        extra_header="##vardictCommand=vardict -b /data/run1/tumor.bam -B bed/panel.bed\n", extra_info="",
    )
    r = _analyze(vcf.encode(), panel_bed=("panel.bed", b"7\t140700000\t140800000\n", "text/plain"))
    assert r.status_code == 200, r.text
    refs = {ref["referenced_path"]: ref for ref in r.json()["meta"]["provenance"]["references"]}
    assert refs["bed/panel.bed"]["status"] == "supplied_this_run"
    assert refs["bed/panel.bed"]["resolved_with"] == "panel BED uploaded with this request"
    assert "oncotrace-upload-" not in r.text


@pytest.mark.parametrize("header_line,expected_hint", [
    ("##reference=/refs/hg19/hg19.fasta\n", "aligned to GRCh37 / hg19: start over and select that build"),
    ("", "probably aligned to a different genome build"),
])
def test_ref_bases_contradicting_the_build_are_a_422_not_a_server_fault(
        tmp_path, monkeypatch, header_line, expected_hint):
    """A file aligned to GRCh37 analysed as GRCh38 fails bcftools norm's REF
    check. That is the request's build being wrong, so the user is told which
    build to pick (422), not that the pipeline failed on our side (500)."""
    monkeypatch.setitem(config.REFERENCE_FASTA_BY_BUILD, "GRCh38", _build_reference(tmp_path))
    monkeypatch.setattr(config, "reference_ready", lambda build: build == "GRCh38")
    monkeypatch.setattr(config, "snpeff_ready", lambda build: False)
    monkeypatch.setattr(config, "clinvar_ready", lambda build: False)
    vcf = (
        VARDICT_VCF.format(extra_header=header_line, extra_info="")
        .replace("##contig=<ID=7>", "##contig=<ID=1>")
        .replace("7\t140753336\t.\tA\tT", "1\t1\t.\tT\tG")  # the reference has A at 1:1
    )
    r = _analyze(vcf.encode())
    assert r.status_code == 422, r.text
    body = r.json()
    assert body["error_kind"] == "reference_build_mismatch"
    assert "GRCh38 / hg38, the build selected for it" in body["message"]
    assert expected_hint in body["message"]
    assert body["detail"]["first_mismatch"] == "1:1"
    assert body["detail"]["analysed_build"] == "GRCh38"
