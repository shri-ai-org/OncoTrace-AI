"""Adapters for callers that follow the VCF specification's standard fields,
plus a last-resort GenericAdapter.

The distinction that matters for honesty: these adapters read only fields whose
meaning the VCF spec (or the caller's own published docs) defines --
FORMAT/AD, FORMAT/DP, FORMAT/AF, INFO/DP, INFO/AF. They never guess at a
proprietary field's semantics. If none of those yield a variant allele
fraction and a depth, the adapter refuses the record instead of inventing one.

Every adapter here reports itself as unvalidated, and GenericAdapter
additionally records which specific fields it used per file, so a reviewer can
confirm the interpretation was correct for their caller.
"""

from .base import CallerAdapter, NormalizedVariant, info_text
from ._format_utils import get_format_value, infer_variant_type


def _info(variant, key):
    try:
        value = variant.INFO.get(key)
    except (KeyError, TypeError):
        return None
    if isinstance(value, tuple):
        return value[0] if value else None
    return value


def _extract_vaf_depth(variant, sample_idx: int) -> tuple[float | None, int | None, int | None, list[str]]:
    """Tries the spec-standard routes to (vaf, depth, alt_reads), in order of
    directness. Returns the provenance of what it used."""
    used: list[str] = []

    depth = get_format_value(variant, "DP", sample_idx, 0)
    if depth is not None:
        used.append("FORMAT/DP")
    else:
        depth = _info(variant, "DP")
        if depth is not None:
            used.append("INFO/DP")

    # AD is [ref, alt...] per the VCF spec.
    alt_reads = get_format_value(variant, "AD", sample_idx, 1)
    ref_reads = get_format_value(variant, "AD", sample_idx, 0)
    if alt_reads is not None:
        used.append("FORMAT/AD")

    vaf = get_format_value(variant, "AF", sample_idx, 0)
    if vaf is not None:
        used.append("FORMAT/AF")
    else:
        vaf = _info(variant, "AF")
        if vaf is not None:
            used.append("INFO/AF")

    # Derive VAF from allelic depths only when the file stated both -- this is
    # arithmetic on given values, not an inferred substitute for missing data.
    if vaf is None and alt_reads is not None:
        denom = depth if depth else (
            (ref_reads + alt_reads) if ref_reads is not None else None
        )
        if denom:
            vaf = alt_reads / denom
            used.append("derived: AD_alt / depth")

    if depth is None and alt_reads is not None and ref_reads is not None:
        depth = int(ref_reads) + int(alt_reads)
        used.append("derived: sum(FORMAT/AD)")

    return (
        round(float(vaf), 6) if vaf is not None else None,
        int(depth) if depth is not None else None,
        int(alt_reads) if alt_reads is not None else None,
        used,
    )


class _SpecStandardAdapter(CallerAdapter):
    """Shared implementation for callers using VCF-spec-standard fields."""

    name = "spec-standard"
    _source_markers: tuple[str, ...] = ()
    _info_markers: tuple[str, ...] = ()

    @classmethod
    def matches(cls, vcf) -> bool:
        header = vcf.raw_header.lower()
        if any(m.lower() in header for m in cls._source_markers):
            return True
        if cls._info_markers:
            info_ids = {rec["ID"] for rec in vcf.header_iter()
                        if rec.type == "INFO" and "ID" in rec.info()}
            return set(cls._info_markers).issubset(info_ids)
        return False

    @classmethod
    def to_normalized(cls, variant, sample_idx: int) -> NormalizedVariant:
        alt = variant.ALT[0] if variant.ALT else "."
        is_symbolic = alt.startswith("<") and alt.endswith(">")
        vaf, depth, alt_reads, used = _extract_vaf_depth(variant, sample_idx)

        if vaf is None or depth is None:
            raise ValueError(
                f"{cls.name}: record at {variant.CHROM}:{variant.POS} does not provide a variant allele "
                f"fraction and depth through any VCF-standard field (FORMAT/AF, FORMAT/AD, FORMAT/DP, "
                f"INFO/AF, INFO/DP). Refusing to guess."
            )

        mq = _info(variant, "MQ") or _info(variant, "MQM")
        svlen = _info(variant, "SVLEN")

        return NormalizedVariant(
            gene=info_text(_info(variant, "GENE")),
            chrom=str(variant.CHROM),
            pos=int(variant.POS),
            ref=variant.REF,
            alt=alt,
            type=info_text(_info(variant, "TYPE")) or infer_variant_type(variant.REF, alt, is_symbolic),
            filter=list(variant.FILTERS) if variant.FILTERS else ["PASS"],
            vaf=vaf,
            depth=depth,
            alt_reads=alt_reads if alt_reads is not None else 0,
            is_symbolic=is_symbolic,
            mq=float(mq) if mq is not None else None,
            svtype=info_text(_info(variant, "SVTYPE")),
            svlen=abs(int(svlen)) if svlen is not None else None,
            caller_warnings=[
                f"{cls.name} adapter is unvalidated against a real {cls.name} file",
                f"fields used: {', '.join(used) or 'none'}",
            ],
        )


class FreeBayesAdapter(_SpecStandardAdapter):
    name = "freebayes"
    _source_markers = ("freebayes",)
    # FreeBayes' characteristic INFO fields.
    _info_markers = ("AO", "RO", "DPB")


class HaplotypeCallerAdapter(_SpecStandardAdapter):
    name = "gatk-haplotypecaller"
    _source_markers = ("haplotypecaller", "genotypegvcfs", "gatkcommandline")


class VarScan2Adapter(_SpecStandardAdapter):
    name = "varscan2"
    _source_markers = ("varscan",)


class LoFreqAdapter(_SpecStandardAdapter):
    name = "lofreq"
    _source_markers = ("lofreq",)


class TorrentVariantCallerAdapter(_SpecStandardAdapter):
    name = "ion-torrent-tvc"
    _source_markers = ("torrent", "tvc", "tmap")


class ConvertedTableAdapter(_SpecStandardAdapter):
    """For VCFs this service generated from a MAF or tabular upload."""
    name = "converted-table"
    _source_markers = ("oncotraceconverted",)


class GenericAdapter(_SpecStandardAdapter):
    """Last resort: any VCF whose caller we don't recognize, read strictly through
    VCF-spec-standard fields. Always matches, so it must be tried last."""

    name = "generic-vcf"

    @classmethod
    def matches(cls, vcf) -> bool:
        return True
