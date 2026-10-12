import gzip
import textwrap

import pytest

from app.core import config
from app.pipeline import readers


def write(tmp_path, name, content, gzip_it=False):
    path = tmp_path / name
    data = textwrap.dedent(content).lstrip()
    if gzip_it:
        path.write_bytes(gzip.compress(data.encode()))
    else:
        path.write_text(data)
    return str(path)


VCF_TEXT = """
    ##fileformat=VCFv4.2
    ##source=VarDict_v1.8.2
    ##contig=<ID=1>
    #CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1
    1\t100\t.\tA\tG\t.\tPASS\tDP=100\tGT\t0/1
"""


def test_detects_plain_vcf(tmp_path):
    assert readers.detect_format(write(tmp_path, "a.vcf", VCF_TEXT)) == "vcf"


def test_detects_gzip_by_magic_bytes_not_extension(tmp_path):
    """A gzip-compressed file named '.vcf' is common in practice; format
    detection must not rely on the filename."""
    path = write(tmp_path, "misleading.vcf", VCF_TEXT, gzip_it=True)
    assert readers.detect_format(path) == "vcf"


def test_decompress_produces_readable_plain_file(tmp_path):
    path = write(tmp_path, "z.vcf.gz", VCF_TEXT, gzip_it=True)
    out = readers.decompress_if_needed(path, tmp_path)
    assert out != path
    assert open(out).read().startswith("##fileformat=VCF")


def test_plain_file_is_not_needlessly_copied(tmp_path):
    path = write(tmp_path, "a.vcf", VCF_TEXT)
    assert readers.decompress_if_needed(path, tmp_path) == path


MAF_TEXT = """
    Hugo_Symbol\tChromosome\tStart_Position\tReference_Allele\tTumor_Seq_Allele2\tt_depth\tt_ref_count\tt_alt_count
    KRAS\t12\t25245350\tC\tT\t800\t600\t200
    TP53\t17\t7674220\tC\tT\t1000\t900\t100
"""


def test_detects_and_reads_maf(tmp_path):
    path = write(tmp_path, "x.maf", MAF_TEXT)
    assert readers.detect_format(path) == "maf"
    rows, mapping = readers.read_tabular_variants(path)
    assert len(rows) == 2
    assert rows[0]["gene"] == "KRAS"
    assert rows[0]["chrom"] == "12"
    assert rows[0]["pos"] == 25245350
    # Mapping is reported so the interpretation can be audited, not trusted.
    assert mapping["gene"] == "Hugo_Symbol"
    assert mapping["alt"] == "Tumor_Seq_Allele2"


def test_maf_vaf_is_derived_from_stated_counts(tmp_path):
    path = write(tmp_path, "x.maf", MAF_TEXT)
    rows, mapping = readers.read_tabular_variants(path)
    out = str(tmp_path / "converted.vcf")
    readers.tabular_to_vcf(rows, mapping, out)
    text = open(out).read()
    assert "AF=0.25" in text   # 200/800, both stated by the source
    assert "AF=0.1" in text    # 100/1000


def test_detects_and_reads_csv_with_fuzzy_headers(tmp_path):
    path = write(tmp_path, "v.csv", """
        gene,chrom,position,ref,alt,vaf,depth
        EGFR,7,55191822,T,G,0.42,1500
    """)
    assert readers.detect_format(path) == "tabular"
    rows, mapping = readers.read_tabular_variants(path)
    assert rows[0]["gene"] == "EGFR"
    assert rows[0]["pos"] == 55191822


def test_percentage_vaf_is_rescaled(tmp_path):
    path = write(tmp_path, "v.csv", """
        gene,chrom,position,ref,alt,vaf
        EGFR,7,55191822,T,G,42.0
    """)
    rows, mapping = readers.read_tabular_variants(path)
    out = str(tmp_path / "c.vcf")
    readers.tabular_to_vcf(rows, mapping, out)
    assert "AF=0.42" in open(out).read()


def test_maf_indel_dash_gets_flagged_anchor_not_invented_sequence(tmp_path):
    """MAF writes '-' for the absent side of an indel. VCF requires a real base,
    which the source doesn't supply, so the record must be flagged rather than
    given plausible-looking invented sequence."""
    path = write(tmp_path, "indel.maf", """
        Hugo_Symbol\tChromosome\tStart_Position\tReference_Allele\tTumor_Seq_Allele2
        BRCA1\t17\t43093464\t-\tACT
    """)
    rows, mapping = readers.read_tabular_variants(path)
    out = str(tmp_path / "c.vcf")
    report = readers.tabular_to_vcf(rows, mapping, out)
    assert report["anchored_indels"] == 1
    text = open(out).read()
    assert "TYPE_ANCHORED=1" in text
    assert "will not match" in text  # header explains the join limitation


def test_table_missing_required_columns_is_rejected_with_detail(tmp_path):
    path = write(tmp_path, "bad.csv", """
        gene,some_other_column
        EGFR,42
    """)
    with pytest.raises(readers.UnsupportedFormatError) as exc:
        readers.detect_format(path)
    assert "expected" in exc.value.detail


def test_unrecognizable_file_is_rejected(tmp_path):
    path = write(tmp_path, "notes.txt", "just some prose about genomics\nnothing structured here\n")
    with pytest.raises(readers.UnsupportedFormatError):
        readers.detect_format(path)


def test_empty_file_is_rejected(tmp_path):
    path = tmp_path / "empty.vcf"
    path.write_text("")
    with pytest.raises(readers.UnsupportedFormatError):
        readers.detect_format(str(path))


# ------------------------------------------------- hostile / oversized input

def test_gzip_bomb_is_stopped_at_the_decompressed_size_cap(tmp_path, monkeypatch):
    """~200 KB of gzip can expand to hundreds of MB; expansion must stop at the
    cap rather than run to completion in memory or the temp dir."""
    monkeypatch.setattr(config, "MAX_DECOMPRESSED_BYTES", 1024 * 1024)
    bomb = tmp_path / "bomb.vcf.gz"
    bomb.write_bytes(gzip.compress(VCF_TEXT.encode() + b"A" * (8 * 1024 * 1024)))
    with pytest.raises(readers.InputTooLargeError):
        readers.decompress_if_needed(str(bomb), tmp_path)


def test_decompressed_size_cap_also_applies_to_tables(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MAX_DECOMPRESSED_BYTES", 1024)
    rows = "".join(f"KRAS\t12\t{25245350 + i}\tC\tT\n" for i in range(200))
    path = tmp_path / "big.maf.gz"
    path.write_bytes(gzip.compress(
        ("Hugo_Symbol\tChromosome\tStart_Position\tReference_Allele\tTumor_Seq_Allele2\n" + rows).encode()
    ))
    with pytest.raises(readers.InputTooLargeError):
        readers.read_tabular_variants(str(path))


@pytest.mark.parametrize("damage", ["corrupt", "truncated"])
def test_damaged_gzip_is_a_format_error_not_a_crash(tmp_path, damage):
    data = gzip.compress(VCF_TEXT.encode() * 200)
    data = data[:10] + b"\xff" * 32 + data[42:] if damage == "corrupt" else data[:-30]
    path = tmp_path / "damaged.vcf.gz"
    path.write_bytes(data)
    with pytest.raises(readers.UnsupportedFormatError) as exc:
        readers.detect_format(str(path))
        readers.decompress_if_needed(str(path), tmp_path)
    assert not isinstance(exc.value, readers.InputTooLargeError)
    assert "corrupt or truncated" in str(exc.value)


def test_table_over_the_record_cap_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MAX_RECORDS", 2)
    path = write(tmp_path, "x.maf", MAF_TEXT + "    BRAF\t7\t140753336\tA\tT\t1000\t850\t150\n")
    with pytest.raises(readers.InputTooLargeError):
        readers.read_tabular_variants(path)


def test_table_at_the_record_cap_is_accepted(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MAX_RECORDS", 2)
    rows, _ = readers.read_tabular_variants(write(tmp_path, "x.maf", MAF_TEXT))
    assert len(rows) == 2


def test_overlong_line_is_rejected_without_reading_it_whole(tmp_path, monkeypatch):
    monkeypatch.setattr(readers, "MAX_LINE_CHARS", 1000)
    path = write(tmp_path, "x.maf", MAF_TEXT.rstrip() + "\tPAD" + "x" * 5000 + "\n")
    with pytest.raises(readers.InputTooLargeError):
        readers.read_tabular_variants(path)


def test_format_sniffing_reads_a_bounded_prefix(tmp_path):
    """A newline-free file is identified (or refused) from its first MB, not
    read in full."""
    path = tmp_path / "one-line.txt"
    path.write_text("x" * (3 * 1024 * 1024))
    with pytest.raises(readers.UnsupportedFormatError) as exc:
        readers.detect_format(str(path))
    assert len(exc.value.detail["detected_header"]) <= 400
