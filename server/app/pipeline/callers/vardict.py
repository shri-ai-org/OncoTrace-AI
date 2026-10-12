"""VarDict adapter -- validated against a real GeneMind SURFSeq5000 targeted
panel VCF (VarDict v1.8.2) used during planning. Field mapping below matches
that file's exact INFO/FORMAT layout.
"""

from .base import CallerAdapter, NormalizedVariant, info_text


def _round(value, dp=6):
    return round(value, dp) if value is not None else None


class VarDictAdapter(CallerAdapter):
    name = "vardict"

    @classmethod
    def matches(cls, vcf) -> bool:
        header = vcf.raw_header
        if "VarDict" in header:
            return True
        # Fallback fingerprint: VarDict's distinctive combination of INFO fields.
        info_ids = {rec["ID"] for rec in vcf.header_iter() if rec.type == "INFO" and "ID" in rec.info()}
        return {"SBF", "ODDRATIO", "HIAF", "SSF"}.issubset(info_ids) or {"SBF", "ODDRATIO", "HIAF"}.issubset(info_ids)

    @classmethod
    def to_normalized(cls, variant, sample_idx: int) -> NormalizedVariant:
        info = variant.INFO
        alt = variant.ALT[0] if variant.ALT else "."
        is_symbolic = alt.startswith("<") and alt.endswith(">")

        vaf = info.get("AF")
        if vaf is None:
            raise ValueError(f"VarDict record at {variant.CHROM}:{variant.POS} is missing INFO/AF")
        if isinstance(vaf, tuple):
            vaf = vaf[0]

        depth = info.get("DP")
        alt_reads = info.get("VD")
        if depth is None or alt_reads is None:
            raise ValueError(f"VarDict record at {variant.CHROM}:{variant.POS} is missing INFO/DP or INFO/VD")

        filters = list(variant.FILTERS) if variant.FILTERS else ["PASS"]

        return NormalizedVariant(
            gene=info_text(info.get("GENE")),
            chrom=str(variant.CHROM),
            pos=int(variant.POS),
            ref=variant.REF,
            alt=alt,
            type=info_text(info.get("TYPE")) or ("DEL" if is_symbolic else "Unknown"),
            filter=filters,
            vaf=_round(float(vaf)),
            depth=int(depth),
            alt_reads=int(alt_reads),
            is_symbolic=is_symbolic,
            mq=_round(info.get("MQ")),
            sn=_round(info.get("SN")),
            hiaf=_round(info.get("HIAF")),
            msi=_round(info.get("MSI")),
            nm=_round(info.get("NM")),
            sbf=_round(info.get("SBF"), 8),
            oddratio=_round(info.get("ODDRATIO")),
            hicnt=info.get("HICNT"),
            hicov=info.get("HICOV"),
            svtype=info_text(info.get("SVTYPE")),
            svlen=abs(info.get("SVLEN")) if info.get("SVLEN") is not None else None,
            end=info.get("END"),
            splitread=info.get("SPLITREAD"),
            spanpair=info.get("SPANPAIR"),
            lseq=info_text(info.get("LSEQ")),
            rseq=info_text(info.get("RSEQ")),
            pmean=_round(info.get("PMEAN")),
        )
