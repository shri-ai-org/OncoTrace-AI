"""Pydantic response models. Mirrors the JSON shape the frontend's page
components already consume (see client/src/features/liquidbiopsy/mockData.js),
so switching the frontend from mock mode to this backend requires no page
component changes.
"""

from typing import Optional
from pydantic import BaseModel, Field


class AnnotationVersions(BaseModel):
    snpeff_db: str
    clinvar_release: str
    civic_release: str
    civic_evidence_rows: int = 0
    population_af_source: Optional[str] = None


class StageResult(BaseModel):
    """One pipeline stage's outcome. `status` is always one of ran /
    skipped_missing_input / skipped_unsupported / failed -- never a bare
    success/failure -- so a stage that did not run can never be mistaken for a
    stage that ran and found nothing. `detail` says why."""
    status: str
    detail: Optional[str] = None


class Meta(BaseModel):
    sample_id: str
    samples_in_file: list[str] = Field(default_factory=list)
    source_filename: str
    input_format: str = "vcf"
    input_conversion: Optional[dict] = None
    vcf_format_version: str
    caller: str
    caller_adapter: str
    caller_adapter_validated: bool
    reference_build: str
    reference_build_source: str
    reference_build_confirmed: bool = False
    reference_build_evidence: Optional[dict] = None
    reference_build_corroboration: Optional[dict] = None
    contig_consistency: Optional[dict] = None
    provenance: Optional[dict] = None
    structural_validation: Optional[dict] = None
    caller_adapter_warning: Optional[str] = None
    panel_bed_supplied: bool = False
    panel_name: Optional[str] = None
    panel_footprint_mb: Optional[float] = None
    panel_footprint_source: Optional[str] = None
    panel_footprint_caveat: Optional[str] = None
    panel_gene_count: Optional[int] = None
    records_skipped: int = 0
    warnings: list[str] = Field(default_factory=list)
    annotation_versions: AnnotationVersions
    analysis_timestamp: str
    stages: dict[str, StageResult]
    disclaimer: str


class DepthStats(BaseModel):
    mean: Optional[float] = None
    median: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class FilterFlagCount(BaseModel):
    flag: str
    count: int
    description: str = ""


class QcSummary(BaseModel):
    total_records: int
    pass_count: int
    non_pass_count: int
    pass_rate: float
    filter_flag_counts: list[FilterFlagCount]
    depth: DepthStats
    mapping_quality: DepthStats
    strand_bias_flag_count: int
    msi_elevated_count: int
    msi_high_count: int
    high_mismatch_count: int


class TypeCount(BaseModel):
    type: str
    count: int


class ChromCount(BaseModel):
    chrom: str
    count: int


class HistogramBucket(BaseModel):
    range: str
    count: int


class VafTiers(BaseModel):
    clonal_ge_30pct: int
    subclonal_5_30pct: int
    low_fraction_lt_5pct: int


class VafProfile(BaseModel):
    histogram: list[HistogramBucket]
    mean: Optional[float] = None
    median: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    tiers: VafTiers
    note: str


class VariantAnnotation(BaseModel):
    consequence_class: Optional[str] = None
    consequence: Optional[str] = None
    impact: Optional[str] = None
    hgvs_c: Optional[str] = None
    hgvs_p: Optional[str] = None
    transcript_id: Optional[str] = None
    gene: Optional[str] = None
    gene_id: Optional[str] = None
    all_transcripts: list[dict] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ClinVarAnnotation(BaseModel):
    match_level: str
    rsid: Optional[str] = None
    clnsig: Optional[str] = None
    clndn: Optional[str] = None
    review_stars: Optional[int] = None
    review_status: Optional[str] = None
    is_conflicting: bool = False
    conflicting_breakdown: Optional[str] = None
    is_low_confidence_assertion: bool = False
    oncogenicity: Optional[str] = None
    population_af: Optional[float] = None
    population_af_source: Optional[str] = None
    reason: Optional[str] = None


class CivicEvidence(BaseModel):
    gene: Optional[str] = None
    variant: Optional[str] = None
    disease: Optional[str] = None
    drugs: list[str] = Field(default_factory=list)
    evidence_level: Optional[str] = None
    clinical_significance: Optional[str] = None
    evidence_id: Optional[str] = None
    citation: Optional[str] = None


class CivicAnnotation(BaseModel):
    match_level: str
    evidence: list[CivicEvidence] = Field(default_factory=list)
    reason: Optional[str] = None
    evidence_floor: Optional[str] = None
    evidence_floor_label: Optional[str] = None
    evidence_floor_note: Optional[str] = None
    qualifying_evidence_count: int = 0
    below_floor_evidence_count: int = 0
    therapies_at_or_above_floor: list[str] = Field(default_factory=list)
    meets_evidence_floor: bool = False


class Variant(BaseModel):
    gene: Optional[str] = None
    chrom: str
    pos: int
    ref: str
    alt: str
    type: str
    filter: list[str]
    filter_pass: bool
    vaf: Optional[float] = None
    depth: Optional[int] = None
    alt_reads: Optional[int] = None
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
    splitread: Optional[int] = None
    spanpair: Optional[int] = None
    pmean: Optional[float] = None
    end: Optional[int] = None
    annotation: VariantAnnotation = Field(default_factory=VariantAnnotation)
    clinvar: ClinVarAnnotation
    civic: CivicAnnotation
    qc: Optional[dict] = None
    germline_pattern: Optional[dict] = None
    tier: Optional[dict] = None
    caller_warnings: list[str] = Field(default_factory=list)


class GeneSummaryRow(BaseModel):
    gene: str
    variant_count: int
    max_vaf: Optional[float] = None
    mean_vaf: Optional[float] = None
    clinvar_max_significance: Optional[str] = None
    civic_variant_level_actionable: bool = False
    civic_gene_level_evidence: bool = False


class ActionabilityGene(BaseModel):
    gene: str
    match_level: str
    evidence_summary: list[str] = Field(default_factory=list)
    therapies: list[str] = Field(default_factory=list)
    meets_evidence_floor: bool = False
    below_floor_only: bool = False


class ActionabilitySummary(BaseModel):
    variant_level_actionable_gene_count: int
    gene_level_evidence_count: int
    genes: list[ActionabilityGene]
    evidence_floor: Optional[str] = None
    evidence_floor_label: Optional[str] = None
    disclaimer: str


class TierSummary(BaseModel):
    """Replaces the former 0-100 scalar. Any single dashboard number must travel
    with its formula, so `review_priority_formula` is always present."""
    counts: dict[str, int]
    definitions: dict[str, str]
    review_priority_count: int
    review_priority_formula: str


class PanelMutationDensity(BaseModel):
    variants_per_mb: float
    pass_variant_count: int
    panel_footprint_mb: float
    footprint_source: str = "unknown"
    disclaimer: str


class GeneCard(BaseModel):
    gene: str
    plain_name: Optional[str] = None
    finding: str
    why: str
    action: str
    evidence_basis: str


class PatientSummary(BaseModel):
    genes_tested: int
    genes_with_findings: int
    genes_with_variant_level_evidence: int
    gene_cards: list[GeneCard]
    next_steps: list[str]


class FilterDefinition(BaseModel):
    flag: str
    description: str


class GlossaryEntry(BaseModel):
    field: str
    full_name: str
    definition: str


class TechnicalReport(BaseModel):
    filter_definitions: list[FilterDefinition]
    field_glossary: list[GlossaryEntry]
    pipeline: dict


class AnalysisResponse(BaseModel):
    meta: Meta
    qc_summary: QcSummary
    variant_type_distribution: list[TypeCount]
    chromosome_distribution: list[ChromCount]
    vaf_profile: VafProfile
    variants: list[Variant]
    structural_variants: list[Variant]
    gene_summary: list[GeneSummaryRow]
    actionability_summary: ActionabilitySummary
    tier_summary: TierSummary
    qc_flag_summary: dict
    germline_summary: dict
    germline_pairing: dict
    panel_mutation_density: Optional[PanelMutationDensity] = None
    patient_summary: PatientSummary
    technical_report: TechnicalReport


class ErrorResponse(BaseModel):
    error_kind: str
    message: str
    detail: Optional[dict] = None
