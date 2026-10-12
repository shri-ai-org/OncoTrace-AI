from app.pipeline import provenance


def test_referenced_paths_are_never_looked_up_on_the_server(tmp_path):
    """Paths come from the uploaded header; checking whether they exist here
    would let an upload probe the server's filesystem."""
    real_file = tmp_path / "panel.bed"
    real_file.write_text("1\t0\t100\n")
    header = f"##fileformat=VCFv4.2\n##vardictCommand=vardict -B {real_file}\n"

    ref, = provenance.mine_header(header)["references"]
    assert ref["status"] == "not_supplied"
    assert ref["resolved_with"] is None


def test_supplied_input_is_reported_by_label():
    header = "##fileformat=VCFv4.2\n##vardictCommand=vardict -B bed/panel_fixed.bed\n"
    result = provenance.mine_header(header, supplied={"panel_or_target_regions": "panel BED uploaded"})
    ref, = result["references"]
    assert ref["status"] == "supplied_this_run"
    assert ref["resolved_with"] == "panel BED uploaded"
    assert result["missing_count"] == 0
