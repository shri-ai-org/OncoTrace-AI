"""Input parsing. Handles VCF (plain/gzip/bgzip), MAF, and tabular variant
exports, converting non-VCF inputs to VCF first so there is one downstream path.
Per-record field extraction is delegated to the detected caller adapter.
"""

from pathlib import Path

from cyvcf2 import VCF

from ..core import config
from . import readers
from .callers.detect import VALIDATED_ADAPTERS, detect_adapter


def _extract_fileformat(raw_header: str) -> str:
    for line in raw_header.splitlines():
        if line.startswith("##fileformat="):
            return line.split("=", 1)[1].strip()
    return "unknown"


def _extract_source(raw_header: str) -> str:
    for line in raw_header.splitlines():
        if line.startswith("##source="):
            return line.split("=", 1)[1].strip()
    return "unknown"


def _pick_sample_index(vcf, adapter, requested: str | None) -> tuple[str, int, list[str]]:
    """Chooses which sample column to analyze in a multi-sample VCF.

    Preference: an explicitly requested sample, then the adapter's own choice
    (e.g. Mutect2's ##tumor_sample), then the first column. A multi-sample file
    where the choice wasn't explicit produces a warning, since silently reading
    a normal sample instead of the tumor would understate every VAF.
    """
    samples = list(vcf.samples)
    warnings: list[str] = []

    if not samples:
        return "(sites-only)", -1, ["VCF has no sample columns; only INFO-level fields are available"]

    if requested:
        if requested not in samples:
            raise ValueError(
                f"Requested sample {requested!r} not found. Samples in this file: {samples}"
            )
        return requested, samples.index(requested), warnings

    chosen = adapter.sample_name(vcf)
    if chosen not in samples:
        chosen = samples[0]

    if len(samples) > 1:
        warnings.append(
            f"This file has {len(samples)} sample columns {samples}; analyzed {chosen!r}. "
            f"Pass sample_name to choose a different one."
        )
    return chosen, samples.index(chosen), warnings


def prepare_input(upload_path: str, workdir: Path) -> tuple[str, dict]:
    """Normalizes any supported input into a plain VCF path.

    Returns (vcf_path, input_meta) where input_meta records the detected format
    and, for converted inputs, exactly how source columns were mapped.
    """
    fmt = readers.detect_format(upload_path)
    info: dict = {"detected_format": fmt, "conversion": None}

    if fmt == "vcf":
        return readers.decompress_if_needed(upload_path, workdir), info

    rows, mapping = readers.read_tabular_variants(upload_path)
    converted = str(workdir / "converted_from_table.vcf")
    info["conversion"] = readers.tabular_to_vcf(rows, mapping, converted)
    info["conversion"]["source_format"] = fmt
    return converted, info


def parse_vcf(path: str, allow_generic: bool = True, sample_name: str | None = None):
    """Returns (normalized_variants, meta)."""
    vcf = VCF(path)
    adapter = detect_adapter(vcf, allow_generic=allow_generic)
    chosen_sample, sample_idx, warnings = _pick_sample_index(vcf, adapter, sample_name)

    variants, record_errors = [], []
    for n, record in enumerate(vcf, 1):
        # Every record is held in memory from here to the JSON response, so the
        # count is capped before an oversized file can exhaust the worker.
        if n > config.MAX_RECORDS:
            raise readers.InputTooLargeError(
                f"This file has more than {config.MAX_RECORDS:,} variant records, the per-file limit."
            )
        try:
            variants.append(adapter.to_normalized(record, sample_idx))
        except Exception as exc:
            # One malformed record shouldn't discard an otherwise usable file, but
            # the count and examples are surfaced so a silently-dropped record is
            # never invisible.
            if len(record_errors) < 10:
                record_errors.append(f"{record.CHROM}:{record.POS}: {exc}")

    meta = {
        "caller_adapter": adapter.name,
        "caller_adapter_validated": adapter.name in VALIDATED_ADAPTERS,
        "sample_id": chosen_sample,
        "samples_in_file": list(vcf.samples),
        "vcf_format_version": _extract_fileformat(vcf.raw_header),
        "caller": _extract_source(vcf.raw_header),
        "raw_header": vcf.raw_header,
        "contigs": list(vcf.seqnames),
        "warnings": warnings,
        "records_skipped": len(record_errors),
        "record_errors": record_errors,
    }
    return variants, meta
