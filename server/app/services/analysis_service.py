"""Orchestrates the full pipeline.

Stage order matters: structural validation and provenance mining happen on
ingest, the QC/artifact layer runs BEFORE clinical annotation (so annotation
never launders an artifact into a clinical claim), and tiering happens last
because it depends on everything above it.

Every stage reports one of: ran | skipped_missing_input | skipped_unsupported |
failed. A stage that didn't run is never rendered as a negative result.
"""

import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from ..core import config, constants as C
from ..pipeline import (
    annotate_civic, annotate_clinvar, annotate_snpeff, metrics, normalize, panel,
    parse, provenance, qc_flags, tiers, tool_budget, validate, zygosity,
)
from ..pipeline.build_detection import (
    _CHROM_LENGTHS, BuildMismatchError, BuildUnresolvedError, build_from_header,
    corroborate_build, resolve_build,
)

RAN = "ran"
SKIPPED_MISSING_INPUT = "skipped_missing_input"
SKIPPED_UNSUPPORTED = "skipped_unsupported"
FAILED = "failed"


class EmptyVariantSetError(Exception):
    pass


def _stage(status: str, detail: str | None = None) -> dict:
    return {"status": status, "detail": detail}


def _variant_key(v) -> str:
    return f"{v.chrom}:{v.pos}:{v.ref}:{v.alt}"


def _build_patient_summary(gene_rows, tier_result, variants, tier_per_variant) -> dict:
    """Plain-language view. Only Tier 1-3 findings are described; Tier 4 and
    unevaluated variants are counted, not narrated, so a benign polymorphism is
    never presented to a patient as a finding."""
    cards = []
    for i, v in enumerate(variants):
        tier = tier_per_variant.get(i, {}).get("tier")
        if tier not in (tiers.TIER_1, tiers.TIER_3):
            continue
        if len(cards) >= 8:
            break
        pct = round((v.vaf or 0) * 100, 1)
        if tier == tiers.TIER_3:
            why = ("This pattern suggests an inherited variant rather than one acquired by the tumor, "
                   "which is a different kind of finding with its own follow-up pathway.")
            action = "Worth discussing whether genetic counseling is appropriate."
        else:
            why = "A curated research database links this kind of change to treatment options."
            action = "Worth discussing with a treating oncologist."
        cards.append({
            "gene": v.gene or "(unannotated)",
            "plain_name": None,
            "finding": f"A change was found in about {pct}% of the DNA fragments tested at this location.",
            "why": why,
            "action": action,
            "evidence_basis": tier,
        })

    counts = tier_result["summary"]["counts"]
    return {
        "genes_tested": len(gene_rows),
        "genes_with_findings": len({c["gene"] for c in cards}),
        "genes_with_variant_level_evidence": counts[tiers.TIER_1],
        "gene_cards": cards,
        "next_steps": [
            "A treating physician reviews all findings in the context of the full clinical picture.",
            "A multidisciplinary tumor board may discuss complex or high-priority findings.",
            "Additional orthogonal testing may confirm findings before any treatment decision.",
            "Follow-up testing may be used to monitor changes over time.",
        ],
    }


def _build_actionability(civic_by_key, variants, civic_release: str, evidence_floor: str) -> dict:
    by_gene: dict[str, dict] = {}
    for v in variants:
        civic = civic_by_key.get(_variant_key(v)) or {}
        if civic.get("match_level", "none") == "none":
            continue
        gene = v.gene or "(unannotated)"
        entry = by_gene.setdefault(gene, {
            "gene": gene,
            "match_level": civic["match_level"],
            "evidence_summary": [],
            "therapies": [],
            "meets_evidence_floor": False,
            "below_floor_only": False,
        })
        if civic["match_level"] == "variant":
            entry["match_level"] = "variant"
        if civic.get("meets_evidence_floor"):
            entry["meets_evidence_floor"] = True
        # Only therapies backed at or above the floor are surfaced.
        for drug in civic.get("therapies_at_or_above_floor", []):
            if drug not in entry["therapies"]:
                entry["therapies"].append(drug)
        for ev in (civic.get("evidence") or [])[:6]:
            if not annotate_civic.meets_evidence_floor(ev.get("evidence_level"), evidence_floor):
                continue
            summary = " / ".join(filter(None, [
                ev.get("clinical_significance"), ev.get("disease"),
                annotate_civic.EVIDENCE_LEVEL_LABELS.get((ev.get("evidence_level") or "").upper()),
            ]))
            if summary and summary not in entry["evidence_summary"]:
                entry["evidence_summary"].append(summary)

    for entry in by_gene.values():
        entry["below_floor_only"] = not entry["meets_evidence_floor"]

    genes = list(by_gene.values())
    return {
        "variant_level_actionable_gene_count": sum(
            1 for g in genes if g["match_level"] == "variant" and g["meets_evidence_floor"]
        ),
        "gene_level_evidence_count": sum(1 for g in genes if g["match_level"] == "gene"),
        "genes": genes,
        "evidence_floor": evidence_floor,
        "evidence_floor_label": annotate_civic.EVIDENCE_LEVEL_LABELS.get(evidence_floor, evidence_floor),
        "disclaimer": C.ACTIONABILITY_DISCLAIMER_TEMPLATE.format(civic_release=civic_release),
    }


def analyze_vcf(upload_path: str, source_filename: str, reference_build_hint: str | None,
                sample_name: str | None = None, panel_bed_path: str | None = None) -> dict:
    workdir = Path(tempfile.mkdtemp(prefix="oncotrace-"))
    stages: dict[str, dict] = {}
    # Every bcftools/SnpEff call below draws on this one time budget.
    budget_token = tool_budget.start()
    try:
        # ---------- ingest: format handling ----------
        prepared_vcf, input_meta = parse.prepare_input(upload_path, workdir)
        stages["input_conversion"] = _stage(
            RAN if input_meta["conversion"] else SKIPPED_UNSUPPORTED,
            f"converted from {input_meta['detected_format'].upper()}" if input_meta["conversion"]
            else f"not needed: input was already {input_meta['detected_format'].upper()}",
        )

        # ---------- §8 structural validation (fail fast) ----------
        # Before parsing, so a broken header is reported as such (cyvcf2 itself
        # only raises a bare Exception); the adapter-specific INFO check needs
        # the adapter parsing detects, so it follows the parse.
        validation = validate.validate_vcf(prepared_vcf)
        probe_variants, probe_meta = parse.parse_vcf(
            prepared_vcf, allow_generic=config.ALLOW_GENERIC_CALLER, sample_name=sample_name
        )
        validate.check_required_info(validation, probe_meta["caller_adapter"])
        stages["structural_validation"] = _stage(
            RAN, f"{len(validation['checks'])} structural check(s) passed"
        )

        variants, parse_meta = probe_variants, probe_meta
        if not variants:
            raise EmptyVariantSetError(
                "No usable variant records were found."
                + (f" {parse_meta['records_skipped']} record(s) could not be interpreted."
                   if parse_meta.get("records_skipped") else "")
            )
        stages["parsing"] = _stage(
            RAN,
            f"{len(variants)} record(s) via the {parse_meta['caller_adapter']} adapter"
            + ("" if parse_meta["caller_adapter_validated"] else " (UNVALIDATED adapter)"),
        )

        # ---------- §1 provenance mining ----------
        prov = provenance.mine_header(
            parse_meta.get("raw_header", ""),
            supplied={"panel_or_target_regions": "panel BED uploaded with this request" if panel_bed_path else None},
        )
        stages["provenance_mining"] = _stage(
            RAN,
            f"{len(prov['references'])} external file reference(s) found, {prov['missing_count']} not supplied",
        )

        # ---------- §2 reference build ----------
        clinvar_paths = {b: str(p) for b, p in config.CLINVAR_VCF_BY_BUILD.items()}
        build, build_source, build_evidence = resolve_build(
            variants, reference_build_hint, parse_meta.get("raw_header", ""), clinvar_paths
        )
        corroboration = corroborate_build(variants, build)
        contig_check = validate.check_contig_consistency(variants, build, _CHROM_LENGTHS)
        build_confirmed = build_source in ("user_supplied", "vcf_header", "empirical_clinvar_probe")
        stages["reference_build_resolution"] = _stage(
            RAN, f"{build} via {build_source}; corroboration: {corroboration['status']}"
        )

        # ---------- normalization (§6: required for correct DB joins) ----------
        ref_fasta = config.REFERENCE_FASTA_BY_BUILD[build]
        working_vcf = str(workdir / "input.vcf")
        shutil.copyfile(prepared_vcf, working_vcf)
        if config.reference_ready(build):
            normalized = str(workdir / "normalized.vcf")
            try:
                normalize.normalize_vcf(working_vcf, normalized, str(ref_fasta))
            except normalize.ReferenceMismatchError as exc:
                # The file's REF bases contradict this build: it was aligned
                # to another one. Reported to the user as such, not as a
                # pipeline failure.
                raise BuildMismatchError(
                    build, build_source, build_from_header(parse_meta.get("raw_header", "")), exc.locus,
                ) from exc
            working_vcf = normalized
            stages["normalization"] = _stage(RAN, "bcftools norm -m -any (left-aligned indels)")
        else:
            stages["normalization"] = _stage(
                SKIPPED_MISSING_INPUT,
                f"reference FASTA for {build} not provisioned; indels are compared in their raw "
                f"representation, which can miss real ClinVar/CIViC matches",
            )

        # ---------- §4 QC / artifact layer (BEFORE clinical annotation) ----------
        qc = qc_flags.evaluate(variants, build if build_confirmed else None)
        stages["qc_artifact_flagging"] = _stage(
            RAN,
            f"{qc['summary']['contamination_candidates']} contamination candidate(s), "
            f"{qc['summary']['confidence_downgraded']} confidence downgrade(s)",
        )

        # ---------- functional annotation (SnpEff) ----------
        snpeff_db = config.SNPEFF_DB_BY_BUILD[build]
        snpeff_annotations: dict = {}
        if config.snpeff_ready(build):
            snpeff_out = str(workdir / "snpeff.vcf")
            annotate_snpeff.run_snpeff(
                working_vcf, snpeff_out, str(config.SNPEFF_JAR), snpeff_db, str(config.SNPEFF_DATA_DIR)
            )
            snpeff_annotations = annotate_snpeff.extract_annotations(snpeff_out)
            working_vcf = snpeff_out
            stages["functional_annotation"] = _stage(RAN, f"SnpEff {snpeff_db}")
        else:
            snpeff_db = "not provisioned"
            stages["functional_annotation"] = _stage(
                SKIPPED_MISSING_INPUT, "SnpEff jar or genome database not provisioned"
            )

        # ---------- clinical significance (local ClinVar) ----------
        clinvar_by_key: dict = {}
        clinvar_vcf = config.CLINVAR_VCF_BY_BUILD[build]
        if not build_confirmed:
            stages["clinical_significance"] = _stage(
                SKIPPED_UNSUPPORTED,
                "reference build is unconfirmed; coordinate-based ClinVar matching is refused",
            )
            clinvar_release = "not applicable"
        elif config.clinvar_ready(build):
            clinvar_out = str(workdir / "clinvar.vcf")
            annotate_clinvar.annotate_with_clinvar(working_vcf, clinvar_out, str(clinvar_vcf), str(ref_fasta))
            clinvar_by_key = annotate_clinvar.extract_clinvar(clinvar_out)
            clinvar_release = config.read_release(config.CLINVAR_RELEASE_FILE, "clinvar")
            matched = sum(1 for c in clinvar_by_key.values() if c["match_level"] == "exact")
            stages["clinical_significance"] = _stage(RAN, f"{matched} exact ClinVar match(es)")
        else:
            stages["clinical_significance"] = _stage(
                SKIPPED_MISSING_INPUT, f"ClinVar VCF for {build} not provisioned"
            )
            clinvar_release = "not provisioned"

        # ---------- actionability (cached CIViC) ----------
        civic_release = config.read_release(config.CIVIC_RELEASE_FILE, "civic")
        cache = annotate_civic.CivicCache(str(config.CIVIC_CACHE), civic_release)
        evidence_floor = annotate_civic.DEFAULT_EVIDENCE_FLOOR
        if not build_confirmed:
            civic_by_key = {}
            stages["actionability"] = _stage(
                SKIPPED_UNSUPPORTED,
                "reference build is unconfirmed; coordinate-based CIViC matching is refused",
            )
            civic_release = "not applicable"
        elif cache.loaded:
            civic_by_key = annotate_civic.annotate_variants(
                variants, snpeff_annotations, cache, build, evidence_floor
            )
            stages["actionability"] = _stage(
                RAN, f"CIViC cache loaded; evidence floor {evidence_floor}"
            )
        else:
            civic_by_key = annotate_civic.annotate_variants(
                variants, snpeff_annotations, cache, build, evidence_floor
            )
            stages["actionability"] = _stage(SKIPPED_MISSING_INPUT, "CIViC cache not provisioned")
            civic_release = "not provisioned"

        # ---------- §5 germline vs somatic ----------
        zygo = zygosity.evaluate(
            variants, clinvar_by_key, parse_meta.get("raw_header", ""), parse_meta["samples_in_file"]
        )
        stages["germline_somatic_pattern"] = _stage(
            RAN if zygo["summary"].get("applied") else SKIPPED_UNSUPPORTED,
            zygo["summary"].get("reason") or (
                f"tumor-only heuristic applied: "
                f"{zygo['summary'].get('putative_heterozygous_germline_pattern', 0)} het-pattern, "
                f"{zygo['summary'].get('putative_homozygous_germline_pattern', 0)} hom-pattern"
            ),
        )

        # ---------- §3 panel footprint ----------
        annotations_by_key = {}
        for v in variants:
            key = _variant_key(v)
            annotations_by_key[key] = {
                "gene": v.gene or (snpeff_annotations.get(key) or {}).get("gene"),
                "clinvar": clinvar_by_key.get(key),
                "civic": civic_by_key.get(key),
            }
        for v in variants:
            v.gene = v.gene or (snpeff_annotations.get(_variant_key(v)) or {}).get("gene")

        gene_rows = metrics.build_gene_summary(variants, annotations_by_key)
        panel_info = panel.resolve_footprint(
            genes=[r["gene"] for r in gene_rows],
            uploaded_bed=panel_bed_path,
            configured_bed=config.PANEL_BED,
            gene_bed=config.GENE_SPANS_BY_BUILD.get(build),
        )
        footprint = panel_info["footprint_mb"]
        stages["panel_footprint"] = _stage(
            RAN if footprint else SKIPPED_MISSING_INPUT,
            f"{footprint} Mb via {panel_info['source']}" if footprint else panel_info["caveat"],
        )

        # ---------- §7 tiering ----------
        annotation_ran = (
            stages["clinical_significance"]["status"] == RAN
            or stages["actionability"]["status"] == RAN
        )
        tier_result = tiers.evaluate(
            variants, clinvar_by_key, civic_by_key, qc["per_variant"],
            zygo["per_variant"], build_confirmed, annotation_ran,
            parse_meta["caller_adapter_validated"],
        )
        stages["tier_classification"] = _stage(
            RAN, f"tier counts: {tier_result['summary']['counts']}"
        )

        # ---------- assemble per-variant records ----------
        variant_records = []
        for i, v in enumerate(variants):
            key = _variant_key(v)
            variant_records.append({
                "gene": v.gene,
                "chrom": v.chrom, "pos": v.pos, "ref": v.ref, "alt": v.alt,
                "type": v.type, "filter": v.filter, "filter_pass": v.filter_pass,
                "vaf": v.vaf, "depth": v.depth, "alt_reads": v.alt_reads,
                "mq": v.mq, "sn": v.sn, "hiaf": v.hiaf, "msi": v.msi, "nm": v.nm,
                "sbf": v.sbf, "oddratio": v.oddratio, "hicnt": v.hicnt, "hicov": v.hicov,
                "pmean": v.pmean,
                "svtype": v.svtype, "svlen": v.svlen, "end": v.end,
                "splitread": v.splitread, "spanpair": v.spanpair,
                "annotation": snpeff_annotations.get(key) or {
                    "consequence_class": "structural" if v.is_symbolic else "sequence_level",
                    "warnings": ["Functional annotation did not run for this request"],
                },
                "clinvar": clinvar_by_key.get(key) or {
                    "match_level": "none",
                    "reason": ("clinvar_annotation_did_not_run"
                               if stages["clinical_significance"]["status"] != RAN
                               else "no_clinvar_record_at_this_coordinate"),
                },
                "civic": civic_by_key.get(key) or {
                    "match_level": "none", "reason": "civic_annotation_did_not_run",
                },
                "qc": qc["per_variant"].get(i),
                "germline_pattern": zygo["per_variant"].get(i),
                "tier": tier_result["per_variant"].get(i),
                "caller_warnings": v.caller_warnings,
            })

        return {
            "meta": {
                "sample_id": parse_meta["sample_id"],
                "samples_in_file": parse_meta["samples_in_file"],
                "source_filename": source_filename,
                "input_format": input_meta["detected_format"],
                "input_conversion": input_meta["conversion"],
                "vcf_format_version": parse_meta["vcf_format_version"],
                "caller": parse_meta["caller"],
                "caller_adapter": parse_meta["caller_adapter"],
                "caller_adapter_validated": parse_meta["caller_adapter_validated"],
                "caller_adapter_warning": (
                    None if parse_meta["caller_adapter_validated"] else
                    f"The {parse_meta['caller_adapter']} adapter has NOT been validated against a "
                    f"known file from that caller. Field interpretation (including VAF and depth) "
                    f"may be wrong. Treat every result below as provisional."
                ),
                "reference_build": build,
                "reference_build_source": build_source,
                "reference_build_confirmed": build_confirmed,
                "reference_build_evidence": build_evidence,
                "reference_build_corroboration": corroboration,
                "contig_consistency": contig_check,
                "provenance": prov,
                "structural_validation": validation,
                "panel_name": config.PANEL_NAME,
                "panel_footprint_mb": footprint,
                "panel_footprint_source": panel_info["source"],
                "panel_footprint_caveat": panel_info["caveat"],
                "panel_gene_count": len(gene_rows),
                "records_skipped": parse_meta["records_skipped"],
                "warnings": parse_meta["warnings"] + parse_meta["record_errors"],
                "annotation_versions": {
                    "snpeff_db": snpeff_db,
                    "clinvar_release": clinvar_release,
                    "civic_release": civic_release,
                    "civic_evidence_rows": len(cache._by_gene) if cache.loaded else 0,
                    "population_af_source": C.POPULATION_AF_SOURCE_NOTE,
                },
                "panel_bed_supplied": bool(panel_bed_path),
                "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
                "stages": stages,
                "disclaimer": C.GLOBAL_DISCLAIMER,
            },
            "qc_summary": metrics.build_qc_summary(variants),
            "qc_flag_summary": qc["summary"],
            "germline_summary": zygo["summary"],
            "germline_pairing": zygo["pairing"],
            "tier_summary": tier_result["summary"],
            "variant_type_distribution": metrics.build_variant_type_distribution(variants),
            "chromosome_distribution": metrics.build_chromosome_distribution(variants),
            "vaf_profile": metrics.build_vaf_profile(variants),
            "variants": variant_records,
            "structural_variants": [r for r in variant_records if r["svtype"]],
            "gene_summary": gene_rows,
            "actionability_summary": _build_actionability(
                civic_by_key, variants, civic_release, evidence_floor
            ),
            "panel_mutation_density": metrics.build_panel_mutation_density(
                variants, footprint, panel_info["source"], panel_info["caveat"]
            ),
            "patient_summary": _build_patient_summary(
                gene_rows, tier_result, variants, tier_result["per_variant"]
            ),
            "technical_report": {
                "filter_definitions": [
                    {"flag": f, "description": d} for f, d in C.FILTER_DESCRIPTIONS.items()
                ],
                "field_glossary": C.FIELD_GLOSSARY,
                "pipeline": {
                    "parser": "cyvcf2",
                    "caller_adapter": parse_meta["caller_adapter"],
                    "stages": {k: v["status"] for k, v in stages.items()},
                },
            },
        }
    finally:
        tool_budget.end(budget_token)
        shutil.rmtree(workdir, ignore_errors=True)
