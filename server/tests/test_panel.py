from pathlib import Path

import pytest

from app.pipeline import panel


def write(tmp_path, name, content):
    p = tmp_path / name
    p.write_text(content)
    return p


def test_footprint_merges_overlapping_intervals():
    """Overlapping or duplicated BED rows must not double-count bases."""
    assert panel._merge_intervals([(0, 100), (50, 150)]) == 150
    assert panel._merge_intervals([(0, 100), (100, 200)]) == 200
    assert panel._merge_intervals([(0, 100), (200, 300)]) == 200
    assert panel._merge_intervals([(0, 100), (0, 100)]) == 100


def test_footprint_from_bed(tmp_path):
    bed = write(tmp_path, "p.bed", "chr1\t0\t500000\tA\nchr2\t0\t500000\tB\n")
    assert panel.footprint_from_bed(str(bed)) == pytest.approx(1.0)


def test_footprint_from_bed_skips_headers_and_bad_rows(tmp_path):
    bed = write(tmp_path, "p.bed", "track name=x\n#comment\nchr1\t0\t1000000\tA\nchr1\tbad\trow\n")
    assert panel.footprint_from_bed(str(bed)) == pytest.approx(1.0)


def test_binary_bed_raises_a_bed_error_not_a_codec_error(tmp_path):
    bed = tmp_path / "p.bed"
    bed.write_bytes(bytes(range(256)) * 4)
    with pytest.raises(panel.PanelBedError):
        panel.footprint_from_bed(str(bed))


def test_uploaded_bed_takes_precedence_and_reports_no_caveat(tmp_path):
    uploaded = write(tmp_path, "up.bed", "1\t0\t2000000\tX\n")
    configured = write(tmp_path, "cfg.bed", "1\t0\t9000000\tY\n")
    result = panel.resolve_footprint(["X"], str(uploaded), configured, None)
    assert result["source"] == "bed_supplied"
    assert result["footprint_mb"] == pytest.approx(2.0)
    assert result["caveat"] is None


def test_configured_bed_used_when_none_uploaded(tmp_path):
    configured = write(tmp_path, "cfg.bed", "1\t0\t3000000\tY\n")
    result = panel.resolve_footprint(["Y"], None, configured, None)
    assert result["source"] == "bed_configured"
    assert result["footprint_mb"] == pytest.approx(3.0)


def test_gene_span_estimate_is_labelled_as_an_estimate(tmp_path):
    """A gene-span footprint includes introns and so overstates a capture panel's
    real footprint -- it must never be presented as exact."""
    gene_bed = write(tmp_path, "genes.bed", "7\t0\t1000000\tEGFR\n17\t0\t500000\tTP53\n")
    result = panel.resolve_footprint(["EGFR", "TP53"], None, None, gene_bed)
    assert result["source"] == "gene_span_estimate"
    assert result["footprint_mb"] == pytest.approx(1.5)
    assert "ESTIMATE ONLY" in result["caveat"]
    assert result["detail"]["genes_resolved"] == 2


def test_gene_span_estimate_reports_unresolved_genes(tmp_path):
    gene_bed = write(tmp_path, "genes.bed", "7\t0\t1000000\tEGFR\n")
    result = panel.resolve_footprint(["EGFR", "NOVELGENE1"], None, None, gene_bed)
    assert result["detail"]["genes_resolved"] == 1
    assert result["detail"]["genes_unresolved"] == ["NOVELGENE1"]


def test_gene_spans_take_widest_span_across_transcripts(tmp_path):
    """refGene lists one row per transcript; the gene's span is their union."""
    gene_bed = write(tmp_path, "genes.bed", "7\t100\t200\tEGFR\n7\t50\t500\tEGFR\n")
    spans = panel.load_gene_spans(str(gene_bed))
    assert spans["EGFR"] == ("7", 50, 500)


def test_no_source_available_returns_none_with_explanation():
    result = panel.resolve_footprint(["EGFR"], None, None, None)
    assert result["footprint_mb"] is None
    assert result["source"] == "unavailable"
    assert "omitted rather than approximated" in result["caveat"]


def test_missing_configured_bed_falls_through_to_gene_estimate(tmp_path):
    gene_bed = write(tmp_path, "genes.bed", "7\t0\t1000000\tEGFR\n")
    result = panel.resolve_footprint(["EGFR"], None, Path("/nonexistent.bed"), gene_bed)
    assert result["source"] == "gene_span_estimate"
