"""Input format handling.

Accepts the formats oncology variant data actually arrives in, and converts
anything that isn't already a VCF into one so the rest of the pipeline has a
single code path:

  * VCF               -- plain, gzip (.vcf.gz), or bgzip (.vcf.bgz)
  * MAF               -- Mutation Annotation Format (TCGA-style, tab-delimited)
  * Tabular           -- generic TSV/CSV variant tables with fuzzy header matching

Compression is detected by magic bytes, not by filename, because a file named
`.vcf` is frequently gzip-compressed in practice (and vice versa).

Conversions are deliberately conservative: a converted record carries only what
the source file actually stated. Nothing is inferred to fill a gap -- a missing
depth stays missing rather than becoming a plausible-looking number.
"""

import csv
import gzip
import io
import itertools
import re
import zlib
from contextlib import contextmanager
from pathlib import Path

from ..core import config


class UnsupportedFormatError(Exception):
    def __init__(self, message: str, detail: dict | None = None):
        self.detail = detail or {}
        super().__init__(message)


class InputTooLargeError(UnsupportedFormatError):
    """Over a size limit (decompressed bytes, record count, line length) --
    reported as a 413, like an over-cap upload."""


# The longest single line read anywhere in this module. Real VCF/MAF lines are
# at most a few KB (a heavily annotated INFO field: tens of KB); without a
# bound, one newline-free upload is read into memory whole.
MAX_LINE_CHARS = 1024 * 1024

# Format sniffing looks at no more than this many lines / characters.
_SNIFF_LINES = 200
_SNIFF_CHARS = 1024 * 1024


# ---------------------------------------------------------------- compression

GZIP_MAGIC = b"\x1f\x8b"


def _is_gzip(path: str) -> bool:
    with open(path, "rb") as fh:
        return fh.read(2) == GZIP_MAGIC


class _CappedStream(io.RawIOBase):
    """A decompressing stream that refuses to yield more than
    config.MAX_DECOMPRESSED_BYTES -- the guard against a gzip bomb, which
    otherwise expands ~1000:1 into memory or the temp dir."""

    def __init__(self, raw):
        self._raw = raw
        self._total = 0

    def readable(self) -> bool:
        return True

    def readinto(self, buffer) -> int:
        n = self._raw.readinto(buffer)
        self._total += n
        if self._total > config.MAX_DECOMPRESSED_BYTES:
            raise InputTooLargeError(
                f"This compressed file expands to more than the "
                f"{config.MAX_DECOMPRESSED_BYTES // (1024 * 1024)} MB limit for decompressed input."
            )
        return n

    def close(self) -> None:
        self._raw.close()
        super().close()


def _open_gzip(path: str) -> io.BufferedReader:
    return io.BufferedReader(_CappedStream(gzip.open(path, "rb")))


@contextmanager
def _decompression_errors():
    """A corrupt or truncated gzip surfaces from deep inside the reader as
    zlib.error / EOFError / BadGzipFile; any of them means a bad upload (400),
    not a server fault (500)."""
    try:
        yield
    except (gzip.BadGzipFile, EOFError, zlib.error) as exc:
        raise UnsupportedFormatError(
            "This file is gzip-compressed but could not be decompressed -- it looks corrupt or truncated.",
            {"decompression_error": str(exc)[:200]},
        ) from None


def open_text(path: str):
    """Opens a possibly-gzip/bgzip-compressed text file. bgzip is gzip-compatible,
    so a single gzip reader covers both. Callers read it inside
    _decompression_errors()."""
    if _is_gzip(path):
        return io.TextIOWrapper(_open_gzip(path), errors="replace")
    return open(path, "r", errors="replace")


def _bounded_lines(fh):
    """Iterates lines like `for line in fh`, but never reads more than
    MAX_LINE_CHARS for one line."""
    while line := fh.readline(MAX_LINE_CHARS + 1):
        if len(line) > MAX_LINE_CHARS:
            raise InputTooLargeError(
                f"This file contains a line longer than {MAX_LINE_CHARS // (1024 * 1024)} MB; "
                f"no variant table has lines that long."
            )
        yield line


def decompress_if_needed(path: str, workdir: Path) -> str:
    """Returns a path to a plain-text copy. cyvcf2 reads gzip fine, but the
    downstream bcftools/SnpEff steps are simpler against a known-plain file."""
    if not _is_gzip(path):
        return path
    out = workdir / "input.decompressed.vcf"
    with _decompression_errors(), _open_gzip(path) as src, open(out, "wb") as dst:
        while chunk := src.read(1024 * 1024):
            dst.write(chunk)
    return str(out)


# ------------------------------------------------------------ format sniffing

def detect_format(path: str) -> str:
    """Returns 'vcf' | 'maf' | 'tabular'. Content-based, not extension-based."""
    head, budget = [], _SNIFF_CHARS
    with _decompression_errors(), open_text(path) as fh:
        for _ in range(_SNIFF_LINES):
            # Bounded: one enormous first "line" must not be read in full just
            # to find out what kind of file this is.
            line = fh.readline(budget)
            if not line:
                break
            head.append(line)
            budget -= len(line)
            if budget <= 0:
                break

    if not head:
        raise UnsupportedFormatError("File is empty.")

    text = "".join(head)
    if text.lstrip().startswith("##fileformat=VCF") or "\n#CHROM\t" in text or text.startswith("#CHROM\t"):
        return "vcf"

    # MAF: tab-delimited with the Hugo_Symbol / Chromosome / Start_Position trio.
    header_line = next((l for l in head if l.strip() and not l.startswith("#")), "")
    header_cells = {c.strip().lower() for c in re.split(r"[\t,]", header_line)}
    if {"hugo_symbol", "chromosome"} <= header_cells or {"chromosome", "start_position"} <= header_cells:
        return "maf"

    if _find_column(header_cells, _CHROM_ALIASES) and _find_column(header_cells, _POS_ALIASES):
        return "tabular"

    raise UnsupportedFormatError(
        "Could not recognize this file as a VCF, MAF, or tabular variant export.",
        {
            "detected_header": header_line.strip()[:400],
            "expected": "a VCF (##fileformat=VCF / #CHROM header), a MAF (Hugo_Symbol + Chromosome + "
                        "Start_Position), or a table with chromosome/position/ref/alt columns",
        },
    )


# ------------------------------------------------- tabular / MAF column mapping

_CHROM_ALIASES = ["chromosome", "chrom", "chr", "#chrom", "contig", "seqnames"]
_POS_ALIASES = ["start_position", "position", "pos", "start", "start_pos", "begin"]
_REF_ALIASES = ["reference_allele", "ref", "ref_allele", "reference", "reference_bases"]
_ALT_ALIASES = ["tumor_seq_allele2", "tumor_seq_allele", "alt", "alt_allele", "alternate",
                "variant_bases", "observed_allele", "tumor_allele"]
_GENE_ALIASES = ["hugo_symbol", "gene", "gene_name", "symbol", "gene_symbol"]
_VAF_ALIASES = ["vaf", "af", "allele_frequency", "tumor_vaf", "variant_allele_frequency", "frequency"]
_DEPTH_ALIASES = ["t_depth", "depth", "dp", "total_depth", "read_depth", "coverage"]
_ALTREADS_ALIASES = ["t_alt_count", "alt_count", "vd", "variant_depth", "alt_reads", "ao"]
_REFREADS_ALIASES = ["t_ref_count", "ref_count", "ref_reads", "ro"]
_FILTER_ALIASES = ["filter", "filter_status"]


def _find_column(available, aliases):
    """`available` is a set/dict of lowercased header names."""
    for alias in aliases:
        if alias in available:
            return alias
    return None


def _sniff_dialect(sample_text: str):
    try:
        return csv.Sniffer().sniff(sample_text, delimiters="\t,;|")
    except csv.Error:
        return csv.excel_tab


def read_tabular_variants(path: str) -> tuple[list[dict], dict]:
    """Parses a MAF or generic variant table into row dicts plus a mapping report
    describing exactly which source column filled each field -- so an operator can
    verify the interpretation rather than trusting it.

    Streams the file: rows are parsed straight off the handle rather than via
    in-memory copies of the whole text, and stop at config.MAX_RECORDS."""
    with _decompression_errors(), open_text(path) as fh:
        lines = (l for l in _bounded_lines(fh) if l.strip() and not l.startswith("##"))
        sample = list(itertools.islice(lines, 20))
        if not sample:
            raise UnsupportedFormatError("File contains no data rows.")
        try:
            return _parse_table(itertools.chain(sample, lines), _sniff_dialect("".join(sample)))
        except csv.Error as exc:
            raise UnsupportedFormatError(f"This table could not be parsed: {str(exc)[:200]}") from None


def _parse_table(lines, dialect) -> tuple[list[dict], dict]:
    reader = csv.DictReader(lines, dialect=dialect)
    fieldnames = reader.fieldnames or []
    lower_to_actual = {(f or "").strip().lower(): f for f in fieldnames}

    col = {
        "chrom": _find_column(lower_to_actual, _CHROM_ALIASES),
        "pos": _find_column(lower_to_actual, _POS_ALIASES),
        "ref": _find_column(lower_to_actual, _REF_ALIASES),
        "alt": _find_column(lower_to_actual, _ALT_ALIASES),
        "gene": _find_column(lower_to_actual, _GENE_ALIASES),
        "vaf": _find_column(lower_to_actual, _VAF_ALIASES),
        "depth": _find_column(lower_to_actual, _DEPTH_ALIASES),
        "alt_reads": _find_column(lower_to_actual, _ALTREADS_ALIASES),
        "ref_reads": _find_column(lower_to_actual, _REFREADS_ALIASES),
        "filter": _find_column(lower_to_actual, _FILTER_ALIASES),
    }
    missing = [k for k in ("chrom", "pos", "ref", "alt") if not col[k]]
    if missing:
        raise UnsupportedFormatError(
            f"Table is missing required column(s) for: {', '.join(missing)}.",
            {"columns_found": fieldnames[:60], "required": ["chromosome", "position", "ref allele", "alt allele"]},
        )

    def get(row, key):
        actual = lower_to_actual.get(col[key]) if col[key] else None
        if not actual:
            return None
        val = (row.get(actual) or "").strip()
        return val or None

    rows = []
    for n, raw in enumerate(reader, 1):
        if n > config.MAX_RECORDS:
            raise InputTooLargeError(
                f"This table has more than {config.MAX_RECORDS:,} rows, the per-file limit."
            )
        chrom = get(raw, "chrom")
        pos = get(raw, "pos")
        if not chrom or not pos:
            continue
        try:
            pos_int = int(float(pos))
        except ValueError:
            continue
        rows.append({
            "chrom": chrom.replace("chr", ""),
            "pos": pos_int,
            "ref": get(raw, "ref") or "N",
            "alt": get(raw, "alt") or "N",
            "gene": get(raw, "gene"),
            "vaf": get(raw, "vaf"),
            "depth": get(raw, "depth"),
            "alt_reads": get(raw, "alt_reads"),
            "ref_reads": get(raw, "ref_reads"),
            "filter": get(raw, "filter"),
        })

    if not rows:
        raise UnsupportedFormatError("No usable variant rows found in this table.")

    report = {k: (lower_to_actual.get(v) if v else None) for k, v in col.items()}
    return rows, report


# --------------------------------------------------- tabular -> VCF conversion

_MAF_TYPE_TO_VCF = {
    "snp": "SNV", "dnp": "Complex", "tnp": "Complex", "onp": "Complex",
    "ins": "Insertion", "del": "Deletion",
}


def _norm_allele(value: str) -> str:
    """MAF uses '-' for the absent side of an indel; VCF has no such convention."""
    v = (value or "").strip().upper()
    if v in ("-", "", "."):
        return ""
    return v


def tabular_to_vcf(rows: list[dict], mapping: dict, out_path: str, sample_name: str = "SAMPLE") -> dict:
    """Writes a minimal spec-valid VCF carrying only values the source stated.

    Where the source gave a VAF but no depth (common in MAF exports), depth is
    left absent rather than back-computed -- a fabricated denominator would make
    QC metrics look real when they aren't.
    """
    header = [
        "##fileformat=VCFv4.2",
        "##source=OncoTraceConverted",
        '##FILTER=<ID=PASS,Description="All filters passed">',
        '##INFO=<ID=TYPE,Number=1,Type=String,Description="Variant Type">',
        '##INFO=<ID=DP,Number=1,Type=Integer,Description="Total Depth">',
        '##INFO=<ID=VD,Number=1,Type=Integer,Description="Variant Depth">',
        '##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">',
        '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene name from source file">',
        '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    ]

    contigs, records, skipped = [], [], 0
    seen_contigs = set()
    for r in rows:
        ref = _norm_allele(r["ref"])
        alt = _norm_allele(r["alt"])
        pos = r["pos"]

        # VCF forbids empty REF/ALT. MAF pure insertions/deletions need an anchor
        # base, which the source doesn't provide, so represent them with an
        # explicit 'N' anchor and flag the record rather than inventing sequence.
        anchored = False
        if not ref and not alt:
            skipped += 1
            continue
        if not ref:
            ref, alt, anchored = "N", "N" + alt, True
        elif not alt:
            ref, alt, anchored = "N" + ref, "N", True

        if r["chrom"] not in seen_contigs:
            seen_contigs.add(r["chrom"])
            contigs.append(f'##contig=<ID={r["chrom"]}>')

        info = [f"TYPE={_infer_type(ref, alt)}"]
        vaf = _as_float(r.get("vaf"))
        depth = _as_int(r.get("depth"))
        alt_reads = _as_int(r.get("alt_reads"))
        ref_reads = _as_int(r.get("ref_reads"))

        if depth is None and alt_reads is not None and ref_reads is not None:
            depth = alt_reads + ref_reads  # stated by the source, just split across two columns
        if vaf is None and depth and alt_reads is not None and depth > 0:
            vaf = round(alt_reads / depth, 6)
        if vaf is not None and vaf > 1:
            vaf = round(vaf / 100, 6)  # source expressed VAF as a percentage

        if depth is not None:
            info.append(f"DP={depth}")
        if alt_reads is not None:
            info.append(f"VD={alt_reads}")
        if vaf is not None:
            info.append(f"AF={vaf}")
        if r.get("gene"):
            info.append(f"GENE={r['gene']}")
        if anchored:
            info.append("TYPE_ANCHORED=1")

        filt = r.get("filter") or "PASS"
        filt = re.sub(r"[^A-Za-z0-9_.;=-]", "_", filt) or "PASS"

        records.append("\t".join([
            r["chrom"], str(pos), ".", ref, alt, ".", filt, ";".join(info), "GT", "0/1",
        ]))

    if not records:
        raise UnsupportedFormatError("No convertible variant rows found (all rows lacked usable alleles).")

    if any("TYPE_ANCHORED=1" in rec for rec in records):
        header.append(
            '##INFO=<ID=TYPE_ANCHORED,Number=0,Type=Flag,Description="Indel anchor base was not present in the '
            'source file; N used as a placeholder. Coordinate-exact database joins will not match this record.">'
        )

    with open(out_path, "w") as fh:
        fh.write("\n".join(header + contigs))
        fh.write("\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t" + sample_name + "\n")
        fh.write("\n".join(records) + "\n")

    return {
        "records_written": len(records),
        "rows_skipped": skipped,
        "column_mapping": mapping,
        "anchored_indels": sum(1 for rec in records if "TYPE_ANCHORED=1" in rec),
    }


def _infer_type(ref: str, alt: str) -> str:
    if len(ref) == 1 and len(alt) == 1:
        return "SNV"
    if len(alt) > len(ref):
        return "Insertion"
    if len(alt) < len(ref):
        return "Deletion"
    return "Complex"


def _as_float(value):
    if value in (None, "", "."):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value):
    if value in (None, "", "."):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None
