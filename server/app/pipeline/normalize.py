"""bcftools norm wrapper -- decomposes multiallelic records and left-aligns
indels so coordinates match ClinVar's own normalized representation. This is
required before any ClinVar/CIViC coordinate join; skipping it silently
breaks those joins rather than raising a visible error.

Symbolic ALT (<DEL> etc.) records pass through largely unchanged by
`bcftools norm -m -any` -- they're matched by gene-overlap downstream, not
exact REF/ALT, so that's expected and not a bug in this step.

This module also exports `ensure_contig_headers()`, the single place that
reconciles two classes of VCF contig-naming problems, before they can
surface as confusing failures several pipeline stages later:

  1. A "chr1"-style upload against this codebase's bare-contig ("1")
     reference FASTAs (or vice versa) -- `bcftools norm` itself only warns
     about this, but fails fatally further downstream trying to fetch the
     sequence from the reference by its unreconciled name. Fixing this
     requires the reference FASTA's own .fai, to know the correct spelling
     to rename to.
  2. A VCF whose header omits (or incompletely declares) ##contig lines --
     permitted by the VCF spec, and tolerated elsewhere in this pipeline
     (validate.py warns rather than fails on it), but `bcftools sort` /
     `bcftools annotate` -- used downstream for the ClinVar/CIViC join --
     refuse to run at all against a record whose CHROM isn't declared in
     its own header. Fixing this does NOT require the reference -- it's
     just declaring what the file's own records already say -- so it still
     runs even if reference resources aren't provisioned on this deployment.

`normalize_vcf()` calls this on the raw upload before `bcftools norm` runs.
SnpEff, run between normalization and the ClinVar join, does not reliably
carry the injected declarations through to its own output -- so
`annotate_clinvar.py` calls `ensure_contig_headers()` again on SnpEff's
output before sorting it, rather than trusting an upstream tool it doesn't
control to preserve them.
"""

import re
import subprocess
from pathlib import Path

from . import tool_budget


class NormalizationError(Exception):
    pass


class ReferenceMismatchError(NormalizationError):
    """The file's REF bases disagree with the reference FASTA. Almost always
    a VCF aligned to a different build than the one it is analysed against,
    i.e. a problem with the request, not a pipeline failure."""

    def __init__(self, locus: str | None):
        self.locus = locus
        super().__init__(f"REF allele does not match the reference genome at {locus or 'a record'}")


# bcftools norm's own wording; the locus is CHROM:POS (no paths).
_REF_MISMATCH = re.compile(r"Reference allele mismatch at (\S+?:\d+)")


def _run(cmd: list[str], what: str) -> subprocess.CompletedProcess:
    """subprocess.run within the analysis's tool budget; an overrun is a
    NormalizationError like any other bcftools failure."""
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=tool_budget.remaining())
    except subprocess.TimeoutExpired:
        raise NormalizationError(f"{what} timed out (analysis tool budget exhausted)") from None


def _read_fai(reference_fasta: str) -> dict[str, int] | None:
    """Contig name -> length, from <reference_fasta>.fai. Returns None if the
    .fai is missing, so the caller can fall back to today's un-reconciled
    behavior rather than fail here."""
    fai_path = Path(f"{reference_fasta}.fai")
    if not fai_path.exists():
        return None
    lengths: dict[str, int] = {}
    with fai_path.open() as fh:
        for line in fh:
            fields = line.split("\t")
            if len(fields) >= 2:
                lengths[fields[0]] = int(fields[1])
    return lengths


def _declared_contigs(vcf_path: str) -> set[str]:
    """Contig names already declared via ##contig=<ID=...> header lines in
    vcf_path -- a header-only read, cheap even for a large file."""
    header = _run(["bcftools", "view", "-h", vcf_path], "bcftools view -h")
    if header.returncode != 0:
        raise NormalizationError(f"bcftools view -h failed: {header.stderr.strip()}")
    declared = set()
    for line in header.stdout.splitlines():
        if line.startswith("##contig=<"):
            for field in line[len("##contig=<"):-1].split(","):
                if field.startswith("ID="):
                    declared.add(field[3:])
                    break
    return declared


def _used_contigs(vcf_path: str) -> list[str]:
    """Contig names actually used by vcf_path's records, in order of first
    appearance -- the authoritative source of truth regardless of whether
    the header declares them (a VCF may validly omit ##contig lines, or
    declare them incompletely)."""
    query = _run(["bcftools", "query", "-f", "%CHROM\n", vcf_path], "bcftools query")
    if query.returncode != 0:
        raise NormalizationError(f"bcftools query failed: {query.stderr.strip()}")
    return list(dict.fromkeys(c for c in query.stdout.splitlines() if c))


def _chr_prefix_rename_map(used_contigs: list[str], reference_contigs: set[str]) -> dict[str, str]:
    """Maps each used contig name not already present in reference_contigs to
    the reference's own spelling, but only when the two names differ purely
    by a "chr" prefix, in either direction. A contig that doesn't resolve
    either way is left out of the mapping -- bcftools norm will still raise
    its own specific error for a genuinely absent contig rather than this
    function guessing (and silently mis-renaming)."""
    mapping: dict[str, str] = {}
    for contig in used_contigs:
        if contig in reference_contigs:
            continue
        if contig.startswith("chr") and contig[3:] in reference_contigs:
            mapping[contig] = contig[3:]
        elif not contig.startswith("chr") and f"chr{contig}" in reference_contigs:
            mapping[contig] = f"chr{contig}"
    return mapping


def _reconcile_contigs(
    input_path: str, output_path: str, mapping: dict[str, str], missing: list[str], fai_lengths: dict[str, int]
) -> str:
    """Single streaming pass over input_path that (a) renames CHROM values
    and any matching ##contig declaration per `mapping`, and (b) injects a
    ##contig=<ID=...,length=...> declaration -- sourced from the reference's
    own .fai -- for every contig in `missing` (already the post-rename
    spelling) that the header doesn't declare. Both problems produce the
    same downstream failure, so both are fixed in the same pass rather than
    as separate bcftools calls -- this is deliberately plain text, not
    `bcftools annotate --rename-chrs` or `bcftools reheader`: both parse the
    full VCF body and refuse to run at all against a record whose CHROM
    isn't declared in the header, which is exactly the condition this
    function exists to fix, making bcftools's own validation circular here.

    Missing declarations are inserted immediately before the #CHROM
    column-header line, the required position for VCF meta-information.
    Output path is derived from `output_path` so it lands in the same
    per-request workdir the caller already cleans up."""
    reconciled_path = f"{output_path}.reconciled-contigs.vcf"
    pending = list(missing)
    with open(input_path) as src, open(reconciled_path, "w") as dst:
        for line in src:
            newline = "\n" if line.endswith("\n") else ""
            body = line[:-1] if newline else line

            if body.startswith("##contig=<") and body.endswith(">"):
                fields = body[len("##contig=<"):-1].split(",")
                for idx, field in enumerate(fields):
                    if field.startswith("ID=") and field[3:] in mapping:
                        fields[idx] = "ID=" + mapping[field[3:]]
                        break
                dst.write("##contig=<" + ",".join(fields) + ">" + newline)
            elif body.startswith("#CHROM"):
                for contig in pending:
                    length = fai_lengths.get(contig)
                    dst.write(f"##contig=<ID={contig},length={length}>\n" if length else f"##contig=<ID={contig}>\n")
                pending = []
                dst.write(line)
            elif body.startswith("#"):
                dst.write(line)
            elif "\t" in body:
                chrom, rest = body.split("\t", 1)
                dst.write(mapping.get(chrom, chrom) + "\t" + rest + newline)
            else:
                dst.write(line)
    return reconciled_path


def ensure_contig_headers(input_path: str, output_path_hint: str, reference_fasta: str) -> str:
    """Returns a path to a VCF whose header declares every contig its records
    actually use -- input_path itself, unchanged, if it's already compliant
    (the common case, and the only case that costs more than two cheap
    scans). `output_path_hint` is used only to derive where a reconciled copy
    is written (same directory, same per-request workdir the caller already
    cleans up) -- it is never read or overwritten itself.

    Two independent problems, only one of which needs the reference:
      - Renaming a "chr1"-style contig to the reference's own spelling (or
        vice versa) requires knowing that spelling, so it only happens when
        reference_fasta's .fai is actually present.
      - Declaring a contig the file already uses correctly, just without a
        ##contig header line for it, does not require any external
        reference at all -- it's just making the header describe what the
        body already says. This still runs even when the .fai is missing
        (e.g. reference resources not yet provisioned on this deployment),
        so `bcftools sort`/`annotate` downstream don't hard-fail over a
        resource gap that has nothing to do with header well-formedness.

    Safe to call more than once on the same logical file as it moves through
    the pipeline: each call re-checks the file it's actually handed, so it
    reconciles whatever gap exists at that point rather than assuming an
    earlier call's fix survived an intervening tool untouched.
    """
    fai_lengths = _read_fai(reference_fasta)
    reference_contigs = set(fai_lengths) if fai_lengths is not None else None

    used = _used_contigs(input_path)
    rename_map = _chr_prefix_rename_map(used, reference_contigs) if reference_contigs is not None else {}

    declared_after_rename = {rename_map.get(c, c) for c in _declared_contigs(input_path)}
    final_contigs = (rename_map.get(c, c) for c in used)
    missing = [c for c in dict.fromkeys(final_contigs) if c not in declared_after_rename]

    if not rename_map and not missing:
        return input_path
    return _reconcile_contigs(input_path, output_path_hint, rename_map, missing, fai_lengths or {})


def normalize_vcf(input_path: str, output_path: str, reference_fasta: str) -> None:
    if not Path(reference_fasta).exists():
        raise NormalizationError(
            f"Reference FASTA not found at {reference_fasta}. Run scripts/download_references.sh "
            f"to provision it before analysis can run."
        )

    norm_input = ensure_contig_headers(input_path, output_path, reference_fasta)

    result = _run(
        ["bcftools", "norm", "-f", reference_fasta, "-m", "-any", "-O", "v", "-o", output_path, norm_input],
        "bcftools norm",
    )
    if result.returncode != 0:
        mismatch = _REF_MISMATCH.search(result.stderr)
        if mismatch:
            raise ReferenceMismatchError(mismatch.group(1))
        raise NormalizationError(f"bcftools norm failed: {result.stderr.strip()}")
