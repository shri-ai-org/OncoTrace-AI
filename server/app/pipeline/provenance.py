"""Provenance mining (spec §1).

VCF headers record the commands that produced the file, and those commands name
external files the analysis depended on -- panel BEDs, reference FASTAs, other
VCFs. Those references are evidence about what the file *is*, and when one names
a panel BED we don't have, that's a concrete missing input rather than an
unknowable.

This stage extracts every referenced path and turns it into a checklist item
stating what it is, whether we have it, and what is degraded without it. Finding
that `bed/panel_fixed.bed` was referenced-but-absent previously took a human
reading the header by hand; it now happens on every ingest.
"""

import re

# Header lines that record a command line or tool provenance.
_COMMAND_LINE_PREFIXES = (
    "##bcftools_", "##GATKCommandLine", "##source", "##DRAGENCommandLine",
    "##snpEffCmd", "##VEP", "##picardCommandLine", "##samtoolsCommand",
    "##vardictCommand", "##commandline", "##CL",
)

# Extensions we care about, mapped to what they'd be used for and what breaks
# without them. Anything else referenced is reported as "other" rather than
# guessed at.
_EXTENSION_ROLES = {
    ".bed": ("panel_or_target_regions",
             "panel footprint and any per-megabase metric (e.g. mutation density) stay null"),
    ".fa": ("reference_fasta", "indel left-alignment (bcftools norm) cannot run, which degrades "
                               "coordinate matching against ClinVar/CIViC"),
    ".fasta": ("reference_fasta", "indel left-alignment (bcftools norm) cannot run, which degrades "
                                  "coordinate matching against ClinVar/CIViC"),
    ".fa.gz": ("reference_fasta", "indel left-alignment (bcftools norm) cannot run"),
    ".vcf": ("companion_vcf", "any comparison or annotation sourced from this VCF is unavailable"),
    ".vcf.gz": ("companion_vcf", "any comparison or annotation sourced from this VCF is unavailable"),
    ".bam": ("alignment_file", "read-level re-inspection of a call is unavailable"),
    ".cram": ("alignment_file", "read-level re-inspection of a call is unavailable"),
    ".txt": ("other", "unknown -- inspect the referenced file to determine its role"),
    ".tsv": ("other", "unknown -- inspect the referenced file to determine its role"),
}

# Matches filesystem-ish tokens inside a command line. Deliberately conservative:
# requires a recognized extension so ordinary flags/values aren't mistaken for paths.
# Extensions are ordered longest-first because regex alternation takes the first
# match -- otherwise '.vcf' would win over '.vcf.gz' and truncate the path.
_PATH_PATTERN = re.compile(
    r"(?P<path>[A-Za-z0-9._\-/\\]+(?:\.vcf\.gz|\.fa\.gz|\.fasta|\.vcf|\.bed|\.fa|\.bam|\.cram|\.txt|\.tsv))",
    re.IGNORECASE,
)

# A path immediately preceded by an output flag is something the command WROTE,
# not an input it depended on -- reporting those as missing inputs is noise.
_OUTPUT_FLAG = re.compile(r"(?:-o|--output(?:-file)?|-O\s*\w)\s*$", re.IGNORECASE)


def _classify(path: str) -> tuple[str, str]:
    lower = path.lower()
    for ext in sorted(_EXTENSION_ROLES, key=len, reverse=True):
        if lower.endswith(ext):
            return _EXTENSION_ROLES[ext]
    return "other", "unknown"


def _tool_of(header_line: str) -> str:
    name = header_line.split("=", 1)[0].lstrip("#")
    return name or "unknown"


def mine_header(raw_header: str, supplied: dict[str, str | None] | None = None) -> dict:
    """Extracts external-file references from a VCF header.

    `supplied` maps a role -> a short label for inputs the caller actually
    provided this run (e.g. {"panel_or_target_regions": "panel BED uploaded with
    this request"}), so a reference can be reported as satisfied. A label, never
    a server path: this ends up in the response.

    Referenced paths are reported, never looked up: they come from the uploaded
    header, and checking whether they exist on this server would let any upload
    probe the server's filesystem.
    """
    supplied = supplied or {}
    references: list[dict] = []
    seen: set[tuple[str, str]] = set()
    tools: list[str] = []

    for line in raw_header.splitlines():
        if not line.startswith(_COMMAND_LINE_PREFIXES):
            continue
        tool = _tool_of(line)
        if tool not in tools:
            tools.append(tool)

        # Skip the '##source=VarDict_v1.8.2' style value; it's a tool name, not a path.
        for match in _PATH_PATTERN.finditer(line):
            path = match.group("path")
            # A bare version string or a URL scheme fragment isn't a useful reference.
            if path.count("/") == 0 and not path.startswith("."):
                if not any(path.lower().endswith(e) for e in (".bed", ".vcf", ".vcf.gz", ".fa", ".fasta")):
                    continue
            # Ignore files this command produced rather than consumed.
            if _OUTPUT_FLAG.search(line[:match.start()]):
                continue
            role, impact = _classify(path)
            key = (role, path)
            if key in seen:
                continue
            seen.add(key)

            # Satisfied only if the caller supplied an equivalent for that role
            # this run.
            supplied_label = supplied.get(role)
            status = "supplied_this_run" if supplied_label else "not_supplied"
            references.append({
                "referenced_path": path,
                "role": role,
                "referenced_by": tool,
                "status": status,
                "resolved_with": supplied_label,
                "impact_if_missing": None if status != "not_supplied" else impact,
            })

    missing = [r for r in references if r["status"] == "not_supplied"]
    return {
        "tools_recorded_in_header": tools,
        "references": references,
        "missing_count": len(missing),
        "checklist": [
            f"referenced: {r['referenced_path']} ({r['role']}) — not supplied — {r['impact_if_missing']}"
            for r in missing
        ],
    }
