"""Panel footprint resolution.

`panel_mutation_density` (variants per megabase) needs the panel's genomic
footprint. That number can come from three sources, and which one was used is
always reported, because they are not equally trustworthy:

  1. `bed_supplied`   -- a BED uploaded with the request. Exact.
  2. `bed_configured` -- a BED provisioned server-side. Exact.
  3. `gene_span_estimate` -- the union of the observed genes' spans, from a
     locally provisioned gene-coordinate BED. An ESTIMATE: gene spans include
     introns, whereas a capture panel targets exons, so this overstates the
     footprint (understating density) by a large and variable factor.

If none are available, the footprint is None and density is simply omitted --
never approximated silently.
"""

from collections import defaultdict
from pathlib import Path


class PanelBedError(Exception):
    """The panel BED is not a readable text BED (e.g. a binary file uploaded by
    mistake). Its own error, so it is never reported as a malformed VCF."""


def _merge_intervals(intervals: list[tuple[int, int]]) -> int:
    """Total covered bases across possibly-overlapping [start, end) intervals."""
    if not intervals:
        return 0
    intervals.sort()
    total = 0
    cur_start, cur_end = intervals[0]
    for start, end in intervals[1:]:
        if start <= cur_end:
            cur_end = max(cur_end, end)
        else:
            total += cur_end - cur_start
            cur_start, cur_end = start, end
    total += cur_end - cur_start
    return total


def footprint_from_bed(bed_path: str) -> float | None:
    """Sums merged interval lengths, so overlapping/duplicated BED rows don't
    inflate the footprint. Raises PanelBedError if the file isn't text."""
    by_chrom: dict[str, list[tuple[int, int]]] = defaultdict(list)
    try:
        with open(bed_path) as fh:
            for line in fh:
                if not line.strip() or line.startswith(("#", "track", "browser")):
                    continue
                parts = line.split()
                if len(parts) < 3:
                    continue
                try:
                    start, end = int(parts[1]), int(parts[2])
                except ValueError:
                    continue
                if end > start:
                    by_chrom[parts[0].replace("chr", "")].append((start, end))
    except OSError:
        return None
    except UnicodeDecodeError:
        raise PanelBedError(
            "The panel BED could not be read: it is not a plain-text BED file "
            "(tab-separated chromosome, start, end per line)."
        ) from None

    total = sum(_merge_intervals(iv) for iv in by_chrom.values())
    return round(total / 1_000_000, 4) if total else None


def load_gene_spans(gene_bed_path: str) -> dict[str, tuple[str, int, int]]:
    """Reads a gene-coordinate BED (chrom, start, end, gene_name) into
    {GENE: (chrom, start, end)}, keeping the widest span per gene name."""
    spans: dict[str, tuple[str, int, int]] = {}
    try:
        with open(gene_bed_path) as fh:
            for line in fh:
                if not line.strip() or line.startswith(("#", "track", "browser")):
                    continue
                parts = line.split()
                if len(parts) < 4:
                    continue
                try:
                    start, end = int(parts[1]), int(parts[2])
                except ValueError:
                    continue
                gene = parts[3].strip().upper()
                chrom = parts[0].replace("chr", "")
                existing = spans.get(gene)
                if existing is None:
                    spans[gene] = (chrom, start, end)
                elif existing[0] == chrom:
                    spans[gene] = (chrom, min(existing[1], start), max(existing[2], end))
    except OSError:
        return {}
    return spans


def estimate_footprint_from_genes(genes, gene_bed_path: str) -> tuple[float | None, dict]:
    """Estimates footprint as the merged span of the observed genes."""
    spans = load_gene_spans(gene_bed_path)
    if not spans:
        return None, {"genes_resolved": 0, "genes_unresolved": sorted({g for g in genes if g})}

    by_chrom: dict[str, list[tuple[int, int]]] = defaultdict(list)
    resolved, unresolved = [], []
    for gene in {g for g in genes if g}:
        entry = spans.get(gene.upper())
        if entry:
            chrom, start, end = entry
            by_chrom[chrom].append((start, end))
            resolved.append(gene)
        else:
            unresolved.append(gene)

    total = sum(_merge_intervals(iv) for iv in by_chrom.values())
    if not total:
        return None, {"genes_resolved": 0, "genes_unresolved": sorted(unresolved)}

    return round(total / 1_000_000, 4), {
        "genes_resolved": len(resolved),
        "genes_unresolved": sorted(unresolved),
    }


def resolve_footprint(genes, uploaded_bed: str | None, configured_bed: Path | None,
                      gene_bed: Path | None) -> dict:
    """Returns {footprint_mb, source, caveat, detail} -- footprint_mb may be None."""
    if uploaded_bed:
        mb = footprint_from_bed(uploaded_bed)
        if mb:
            return {
                "footprint_mb": mb,
                "source": "bed_supplied",
                "caveat": None,
                "detail": {"note": "computed from the panel BED uploaded with this request"},
            }

    if configured_bed and configured_bed.exists():
        mb = footprint_from_bed(str(configured_bed))
        if mb:
            return {
                "footprint_mb": mb,
                "source": "bed_configured",
                "caveat": None,
                "detail": {"note": f"computed from the server-configured panel BED at {configured_bed.name}"},
            }

    if gene_bed and gene_bed.exists():
        mb, detail = estimate_footprint_from_genes(genes, str(gene_bed))
        if mb:
            return {
                "footprint_mb": mb,
                "source": "gene_span_estimate",
                "caveat": (
                    "ESTIMATE ONLY: derived from whole-gene spans (which include introns) for the genes "
                    "observed in this file, not from the panel's actual capture regions. A real capture "
                    "panel targets exons, so this footprint is substantially larger than the true one and "
                    "the resulting density is correspondingly understated. Upload the panel BED for an "
                    "exact figure."
                ),
                "detail": detail,
            }

    return {
        "footprint_mb": None,
        "source": "unavailable",
        "caveat": (
            "No panel BED was supplied or configured and no gene-coordinate reference is provisioned, "
            "so panel footprint and mutation density are omitted rather than approximated."
        ),
        "detail": {},
    }
