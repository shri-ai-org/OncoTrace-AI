"""Reference genome build resolution.

Most VCFs -- including VarDict output and the GeneMind sample this was built
against -- don't state which reference build their coordinates refer to, and
getting it wrong silently invalidates every coordinate-based annotation.

Three strategies, in descending order of reliability:

  1. `explicit`  -- the header states it, or the caller passed a hint.
  2. `empirical` -- probe the actual variant coordinates against BOTH builds'
                    local ClinVar VCFs and see which yields materially more
                    exact REF/ALT matches. This is real evidence from the data
                    rather than an assumption.
  3. `bounds`    -- chromosome-length plausibility, which can only rule a build
                    OUT. Never used to select a build on its own.

If nothing reaches the confidence threshold, the request fails with a 422 that
reports what each strategy found, so the answer is "we don't know, here's why"
rather than a silent guess.
"""

import re
import subprocess
from pathlib import Path

from . import tool_budget

# Approximate primary-assembly chromosome lengths (bp), GRCh37 vs GRCh38.
# Used only to rule a build IN/OUT by plausibility -- not proof of a match.
_CHROM_LENGTHS = {
    "GRCh37": {
        "1": 249250621, "2": 243199373, "3": 198022430, "4": 191154276, "5": 180915260,
        "6": 171115067, "7": 159138663, "8": 146364022, "9": 141213431, "10": 135534747,
        "11": 135006516, "12": 133851895, "13": 115169878, "14": 107349540, "15": 102531392,
        "16": 90354753, "17": 81195210, "18": 78077248, "19": 59128983, "20": 63025520,
        "21": 48129895, "22": 51304566, "X": 155270560, "Y": 59373566,
    },
    "GRCh38": {
        "1": 248956422, "2": 242193529, "3": 198295559, "4": 190214555, "5": 181538259,
        "6": 170805979, "7": 159345973, "8": 145138636, "9": 138394717, "10": 133797422,
        "11": 135086622, "12": 133275309, "13": 114364328, "14": 107043718, "15": 101991189,
        "16": 90338345, "17": 83257441, "18": 80373285, "19": 58617616, "20": 64444167,
        "21": 46709983, "22": 50818468, "X": 156040895, "Y": 57227415,
    },
}

SUPPORTED_BUILDS = tuple(_CHROM_LENGTHS.keys())

# An empirical call needs enough absolute hits to be meaningful, and a clear
# margin over the alternative. A panel where both builds match equally (common
# for genes whose coordinates barely moved between builds) stays unresolved.
_MIN_PROBE_HITS = 3
_MIN_WIN_RATIO = 2.0


# Gene spans that moved substantially between builds, used to corroborate (never
# override) a declared build. Values are approximate primary-assembly spans and
# are padded generously below, because assemblies get patched -- this is a sanity
# check, not a source of truth.
_CORROBORATION_GENES = {
    "BRAF": {
        "chrom": "7",
        "GRCh38": (140_719_327, 140_924_928),
        "GRCh37": (140_433_813, 140_624_564),
    },
    "MYC": {
        "chrom": "8",
        "GRCh38": (127_735_434, 127_742_951),
        "GRCh37": (128_748_315, 128_753_680),
    },
    "EGFR": {
        "chrom": "7",
        "GRCh38": (55_019_017, 55_211_628),
        "GRCh37": (55_086_714, 55_279_321),
    },
}

# Padding around each span. Panel probes and UTR-adjacent calls legitimately sit
# slightly outside a gene body, so a narrow window would produce false alarms.
_CORROBORATION_PAD = 50_000


def corroborate_build(variants, declared_build: str) -> dict:
    """Checks a declared build against gene-span expectations.

    Never switches the build -- it either confirms, finds nothing to check, or
    raises a loud mismatch warning for a human to resolve.
    """
    supports: list[dict] = []
    conflicts: list[dict] = []

    for v in variants:
        gene = (v.gene or "").upper()
        spec = _CORROBORATION_GENES.get(gene)
        if not spec or v.chrom.replace("chr", "") != spec["chrom"]:
            continue

        consistent_with = []
        for build in SUPPORTED_BUILDS:
            lo, hi = spec[build]
            if lo - _CORROBORATION_PAD <= v.pos <= hi + _CORROBORATION_PAD:
                consistent_with.append(build)

        if not consistent_with:
            continue  # outside both windows; says nothing either way
        entry = {
            "gene": gene,
            "locus": f"{v.chrom}:{v.pos}",
            "consistent_with": consistent_with,
            "declared_build": declared_build,
        }
        if declared_build in consistent_with:
            supports.append(entry)
        else:
            conflicts.append(entry)

    if conflicts:
        genes = sorted({c["gene"] for c in conflicts})
        alternatives = sorted({b for c in conflicts for b in c["consistent_with"]})
        return {
            "status": "conflict",
            "checked_variant_count": len(supports) + len(conflicts),
            "supporting": supports,
            "conflicting": conflicts,
            "warning": (
                f"Declared build is {declared_build}, but variant positions in "
                f"{'/'.join(genes)} are only consistent with {'/'.join(alternatives)}. "
                f"Re-confirm the build before trusting any annotation below -- coordinates were "
                f"NOT changed automatically."
            ),
        }

    if supports:
        return {
            "status": "consistent",
            "checked_variant_count": len(supports),
            "supporting": supports,
            "conflicting": [],
            "warning": None,
        }

    return {
        "status": "not_checkable",
        "checked_variant_count": 0,
        "supporting": [],
        "conflicting": [],
        "warning": None,
        "detail": (
            f"No variant fell in a gene with a large known build-to-build offset "
            f"({', '.join(sorted(_CORROBORATION_GENES))}), so the declared build could not be "
            f"corroborated from coordinates. It has been used as declared."
        ),
    }


class BuildUnresolvedError(Exception):
    def __init__(self, heuristic_result: dict):
        self.heuristic_result = heuristic_result
        super().__init__("Reference build could not be resolved without an explicit hint")


class BuildMismatchError(Exception):
    """The file's REF bases contradict the build the analysis ran against, so
    the build that was selected (or stated in the header) is not the one the
    file was aligned to. A problem with the request, never a pipeline fault."""

    def __init__(self, build: str, source: str, header_build: str | None, locus: str | None):
        self.build = build
        self.source = source
        self.header_build = header_build
        self.locus = locus
        super().__init__(f"REF bases do not match {build} ({source}) at {locus or 'a record'}")


def build_from_header(raw_header: str) -> str | None:
    """Recognizes the several ways a VCF may state its build: an ##assembly or
    ##reference line, a contig assembly= attribute, or a reference filename."""
    patterns = [
        (r"GRCh38|hg38", "GRCh38"),
        (r"GRCh37|hg19|b37", "GRCh37"),
    ]
    for line in raw_header.splitlines():
        low = line.lower()
        if not any(k in low for k in ("##assembly", "##reference", "assembly=", "##contig")):
            continue
        for pattern, build in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                return build
    return None


def _plausible_builds(variants) -> dict:
    plausible = {b: True for b in SUPPORTED_BUILDS}
    violations = {b: [] for b in SUPPORTED_BUILDS}
    for v in variants:
        chrom = v.chrom.replace("chr", "")
        for build, lengths in _CHROM_LENGTHS.items():
            max_len = lengths.get(chrom)
            if max_len is not None and v.pos > max_len:
                plausible[build] = False
                if len(violations[build]) < 5:
                    violations[build].append({"chrom": chrom, "pos": v.pos, "build_max": max_len})
    return {
        "plausible_builds": [b for b, ok in plausible.items() if ok],
        "violations": {b: v for b, v in violations.items() if v},
    }


def _probe_clinvar(variants, clinvar_vcf: Path, limit: int = 400) -> int | None:
    """Counts how many of this file's variants match the given ClinVar VCF at
    exactly CHROM:POS:REF:ALT. Returns None if the database isn't available.

    Uses `bcftools query` region lookups rather than a full annotate pass, so
    probing both builds stays cheap.
    """
    if not (clinvar_vcf.exists() and Path(f"{clinvar_vcf}.tbi").exists()):
        return None

    sequence_level = [
        v for v in variants
        if not v.is_symbolic and v.ref and v.alt and set(v.ref) <= set("ACGTN") and set(v.alt) <= set("ACGTN")
    ][:limit]
    if not sequence_level:
        return 0

    regions = "\n".join(f"{v.chrom.replace('chr', '')}\t{v.pos}" for v in sequence_level)
    try:
        result = subprocess.run(
            ["bcftools", "query", "-f", "%CHROM\t%POS\t%REF\t%ALT\n", "-R", "-", str(clinvar_vcf)],
            # Capped at 180s as before, and never past the analysis's budget.
            input=regions, capture_output=True, text=True, timeout=min(180, tool_budget.remaining()),
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None

    clinvar_keys = set()
    for line in result.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) >= 4:
            clinvar_keys.add(f"{parts[0].replace('chr', '')}:{parts[1]}:{parts[2]}:{parts[3]}")

    return sum(
        1 for v in sequence_level
        if f"{v.chrom.replace('chr', '')}:{v.pos}:{v.ref}:{v.alt}" in clinvar_keys
    )


def probe_builds(variants, clinvar_paths: dict) -> dict:
    """Runs the ClinVar probe against every available build."""
    hits, unavailable = {}, []
    for build in SUPPORTED_BUILDS:
        path = clinvar_paths.get(build)
        count = _probe_clinvar(variants, Path(path)) if path else None
        if count is None:
            unavailable.append(build)
        else:
            hits[build] = count
    return {"clinvar_exact_match_counts": hits, "databases_unavailable_for": unavailable}


def resolve_build(variants, reference_build_hint: str | None, raw_header: str = "",
                  clinvar_paths: dict | None = None) -> tuple[str, str, dict]:
    """Returns (build, source, evidence).

    `source` is one of: user_supplied | vcf_header | empirical_clinvar_probe.
    Raises BuildUnresolvedError when no strategy reaches confidence.
    """
    evidence: dict = {}

    if reference_build_hint:
        if reference_build_hint not in SUPPORTED_BUILDS:
            raise ValueError(
                f"Unsupported reference_build_hint {reference_build_hint!r}; expected one of {SUPPORTED_BUILDS}"
            )
        return reference_build_hint, "user_supplied", {"note": "build supplied by caller"}

    header_build = build_from_header(raw_header)
    if header_build:
        return header_build, "vcf_header", {"note": f"build stated in VCF header as {header_build}"}

    bounds = _plausible_builds(variants)
    evidence["chromosome_bounds"] = bounds

    probe = probe_builds(variants, clinvar_paths or {})
    evidence["clinvar_probe"] = probe
    counts = probe["clinvar_exact_match_counts"]

    if counts:
        ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        best_build, best_hits = ranked[0]
        runner_hits = ranked[1][1] if len(ranked) > 1 else 0
        # A build only wins on a clear margin and enough absolute evidence.
        if best_hits >= _MIN_PROBE_HITS and best_hits >= max(runner_hits * _MIN_WIN_RATIO, runner_hits + 2):
            evidence["decision"] = (
                f"{best_build} matched {best_hits} ClinVar records at exact CHROM:POS:REF:ALT vs "
                f"{runner_hits} for the alternative"
            )
            return best_build, "empirical_clinvar_probe", evidence
        evidence["decision"] = (
            f"inconclusive: best={best_build} with {best_hits} exact ClinVar matches, "
            f"runner-up {runner_hits} -- margin too small to call"
        )

    # Bounds can rule a build out but never select one, so an unresolved build
    # is reported rather than guessed.
    raise BuildUnresolvedError(evidence)
