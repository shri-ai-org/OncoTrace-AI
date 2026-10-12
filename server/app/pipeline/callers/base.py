"""Caller-adapter interface. Each variant caller (VarDict, Mutect2, Strelka2,
DRAGEN) has different INFO/FORMAT conventions and VAF semantics. An adapter's
job is to map one caller's raw fields into a single NormalizedVariant shape
that everything downstream (annotation, metrics, schema) consumes uniformly.

Only VarDictAdapter is validated against a real file (the S5 GeneMind
SURFSeq5000 sample used during planning). Mutect2Adapter, Strelka2Adapter, and
DragenAdapter are built from each caller's public documentation and must be
checked against a real sample from that caller before being trusted in
production -- do not represent them as equally proven.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NormalizedVariant:
    gene: Optional[str]
    chrom: str
    pos: int
    ref: str
    alt: str
    type: str  # SNV | Insertion | Deletion | Complex | DEL (symbolic/SV)
    filter: list[str]  # e.g. ["PASS"] or ["NM5.25"] or ["MSI12", "LongMSI"]
    vaf: float
    depth: int
    alt_reads: int
    is_symbolic: bool = False
    mq: Optional[float] = None
    sn: Optional[float] = None
    hiaf: Optional[float] = None
    msi: Optional[float] = None
    nm: Optional[float] = None
    sbf: Optional[float] = None
    oddratio: Optional[float] = None
    hicnt: Optional[int] = None
    hicov: Optional[int] = None
    svtype: Optional[str] = None
    svlen: Optional[int] = None
    end: Optional[int] = None
    splitread: Optional[int] = None
    spanpair: Optional[int] = None
    # Flanking sequence, when the caller reports it (VarDict LSEQ/RSEQ). Used to
    # detect homopolymer context for callers that provide no MSI field.
    lseq: Optional[str] = None
    rseq: Optional[str] = None
    # Mean distance of the variant to the nearest read end (VarDict PMEAN);
    # extreme values indicate position bias.
    pmean: Optional[float] = None
    caller_warnings: list[str] = field(default_factory=list)

    @property
    def filter_pass(self) -> bool:
        return self.filter == ["PASS"]


def info_text(value) -> Optional[str]:
    """An INFO value meant as text (GENE, TYPE, SVTYPE, LSEQ...), as a str.

    cyvcf2 types INFO values by the uploaded file's OWN header, so a file that
    declares e.g. GENE as Type=Integer yields an int here -- which then crashes
    every downstream .upper()/.lower() with a 500. Coerced once, at the adapter
    boundary, instead of defended at each use."""
    if value is None:
        return None
    if isinstance(value, tuple):  # Number=A/R/. fields
        value = ",".join(str(v) for v in value)
    return str(value) or None


class UnsupportedCallerError(Exception):
    """Raised when no adapter recognizes the VCF's caller -- a hard failure,
    not a best-effort guess, since silently misreading VAF/DP for an
    unsupported format is worse than an explicit rejection."""

    def __init__(self, source_hint: str):
        self.source_hint = source_hint
        super().__init__(f"Unrecognized variant caller (source hint: {source_hint!r})")


class CallerAdapter:
    name: str = "base"

    @classmethod
    def matches(cls, vcf) -> bool:
        raise NotImplementedError

    @classmethod
    def sample_name(cls, vcf) -> str:
        samples = vcf.samples
        if not samples:
            raise ValueError("VCF has no sample columns")
        return samples[0]

    @classmethod
    def to_normalized(cls, variant, sample_idx: int) -> NormalizedVariant:
        raise NotImplementedError
