# OncoTrace VCF Analysis Backend

Parses uploaded oncology-panel VCFs and annotates them against **locally-hosted**
open-source databases. Feeds the liquid-biopsy dashboard in `../client`.

> **Status: early-stage research pipeline.** Variant parsing, artifact detection,
> and every derived metric are real. There is no trained or clinically validated
> predictive model here, and no opaque risk score — variants are placed in
> disclosed tiers with per-variant reasons (see `app/pipeline/tiers.py`).
> Not a diagnostic device.

## Why local-only annotation

Real patient VCFs will eventually flow through this service, so no variant data
is ever sent to a third-party API. Annotation runs against reference databases
downloaded once to `resources/` and read from disk at request time.

Uploads are processed in a per-request temp directory and deleted in a `finally`
block. Nothing is persisted. Logs record aggregate stats and a content hash
only — never VCF contents.

## Setup

```bash
cd server
python3 -m venv .venv          # if ensurepip is missing: python3 -m venv --without-pip .venv
                               # then: curl -sS https://bootstrap.pypa.io/get-pip.py | .venv/bin/python3
.venv/bin/pip install -r requirements.txt        # production
.venv/bin/pip install -r requirements-dev.txt    # + pytest/httpx, for development
```

System tools required on PATH: `bcftools`, `bgzip`, `tabix`, `samtools`, and
`java` (for SnpEff).

## Reference databases

Each annotation stage needs its own dataset. **Stages whose data is absent are
skipped and reported as skipped** in `meta.stages` — they are never silently
treated as "ran and found nothing". Parsing and all derived metrics work with
zero reference data, so the service is useful before everything is provisioned.

| Stage | Provision with | Size |
|---|---|---|
| Actionability (CIViC) | `./scripts/download_references.sh civic` | ~15 MB |
| Clinical significance (ClinVar) | `./scripts/download_references.sh clinvar-grch38` | ~185 MB |
| Empirical build detection (both ClinVar builds) | `./scripts/download_references.sh build-detection` | ~370 MB |
| Panel footprint estimate (gene spans) | `./scripts/download_references.sh gene-spans-grch38` | ~10 MB |
| Functional annotation (SnpEff) | `./scripts/download_references.sh snpeff-grch38` | ~1.5 GB |
| Normalization (reference FASTA) | `./scripts/download_references.sh reference-grch38` | ~3 GB unpacked |

Or everything: `./scripts/download_references.sh all-grch38`.
`resources/` is gitignored — these are never committed.

Check what's live: `curl localhost:8000/api/v1/health`

## Run

```bash
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Swagger UI (`/docs`) is off by default; set `ONCOTRACE_API_DOCS=true` in
`server/.env` to browse the API locally.

The Vite dev server proxies `/api` here (see `client/vite.config.js`). To point
the frontend at it instead of its built-in mock, set in `client/.env`:

```
VITE_LB_USE_MOCK_API=false
```

## API

`POST /api/v1/vcf/analyze` — multipart upload.

| Field | Required | Notes |
|---|---|---|
| `vcf_file` | yes | VCF (plain/gzip/bgzip), MAF, or TSV/CSV variant table |
| `reference_build_hint` | recommended | `GRCh37` or `GRCh38`. Omit to let the pipeline determine it empirically |
| `panel_bed` | no | Panel BED for an exact footprint; density stays null without it |
| `sample_name` | no | Which sample column to analyze in a multi-sample VCF |

```bash
curl -u "$ONCOTRACE_DEMO_USERNAME:$ONCOTRACE_DEMO_PASSWORD" \
     -F vcf_file=@tests/fixtures/S5.panel.annotated.vcf \
     -F reference_build_hint=GRCh38 \
     http://localhost:8000/api/v1/vcf/analyze
```

**On the reference build:** many VCFs (including the GeneMind sample this was
built against) don't state their build. The API never guesses. It resolves one of
three ways, and reports which:

1. `user_supplied` — you passed `reference_build_hint`.
2. `vcf_header` — an `##assembly`/`##reference`/contig line states it.
3. `empirical_clinvar_probe` — the file's coordinates are probed against **both**
   ClinVar builds; a build wins only on a clear margin (≥3 absolute matches and
   ≥2× the alternative). Requires `build-detection` to be provisioned.

Otherwise: `422 reference_build_unresolved`, with the evidence in `detail`.

When the reference FASTA is provisioned, normalization also checks every REF
allele against it. A file whose bases contradict the chosen build (for example
a GRCh37 file analysed as GRCh38) gets `422 reference_build_mismatch`, which
says which build to choose, rather than a pipeline failure.

Separately, a **corroboration check** always runs against gene spans that moved
substantially between builds (BRAF, MYC, EGFR). It never changes the build — it
raises a loud warning when the declared build contradicts the coordinates.

### Errors

All errors, including authentication failures, return
`{error_kind, message, detail?}`; `error_kind` maps directly to the frontend's
error states. No response ever carries `WWW-Authenticate` (it would make the
browser show its own login dialog over the app's).

| Status | `error_kind` | Cause |
|---|---|---|
| 400 | `malformed_vcf` | Bad extension, empty file, unparseable (incl. corrupt/truncated gzip, broken header), or unsupported caller |
| 400 | `malformed_panel_bed` | The uploaded `panel_bed` is not a plain-text BED |
| 401 | `unauthorized` | Missing or wrong demo credential. For uploads this is decided from the headers, before any of the body is read |
| 413 | `malformed_vcf` | Over a size limit: upload (500 MB), decompressed size (2 GiB), or record count (20,000) |
| 422 | `reference_build_unresolved` | No build hint and none can be confirmed |
| 422 | `reference_build_mismatch` | The file's REF bases don't match the build it was analysed against (it was aligned to the other build); `detail` names the first mismatching locus and any build stated in the header |
| 422 | `malformed_vcf` | Parsed fine but contained no variant records |
| 500 | `annotation_failure` | An annotation subprocess failed or ran out of the analysis time budget; `detail.incident_id` matches the server log |
| 503 | `auth_not_configured` | No usable demo credential on the server (unset, placeholder, or under 12 characters) |
| 503 | `annotation_failure` | At capacity: another analysis is running. Also decided before the body is read |

Limits are set in the environment; `.env.example` lists every setting with its
default.

## Pipeline stages

Every stage reports one of `ran` / `skipped_missing_input` /
`skipped_unsupported` / `failed` in `meta.stages`, with a reason. **A stage that
did not run is never rendered as a negative result.**

| Stage | What it does |
|---|---|
| `input_conversion` | Converts MAF / TSV / CSV input to VCF; reports the column mapping used |
| `structural_validation` | Header, contigs, sample columns, caller-required INFO fields. Fails fast |
| `parsing` | cyvcf2 read through the detected caller adapter |
| `provenance_mining` | Extracts external files referenced in the header (panel BEDs, FASTAs) and flags any not supplied |
| `reference_build_resolution` | Explicit hint → header → empirical ClinVar probe. Never guesses |
| `normalization` | `bcftools norm` left-alignment, required for correct database joins |
| `qc_artifact_flagging` | Runs **before** annotation: contaminants, microsatellite context, hypervariable loci, duplicate SVs, composite QC |
| `functional_annotation` | SnpEff consequence / HGVS |
| `clinical_significance` | Local ClinVar: germline CLNSIG, somatic ONC, review stars, conflicts, population AF |
| `actionability` | Cached CIViC, gated by evidence level |
| `germline_somatic_pattern` | Tumor-only allele-fraction heuristic, or paired-normal detection |
| `panel_footprint` | Uploaded BED → configured BED → gene-span estimate → null |
| `tier_classification` | Assigns each variant to one tier |

## Artifact & QC detection

Runs before clinical annotation, so annotation can never launder an artifact into
a clinical claim. A variant can be both "ClinVar: Pathogenic" and
"QC: contamination_candidate" — both are reported.

- **Cross-locus contaminants** — an exact ≥12bp shared inserted motif across ≥2
  records on different chromosomes (or >1 Mb apart). Runs regardless of the
  caller's FILTER, because a `PASS` contaminant was observed in real data.
- **Microsatellite/homopolymer context** — caller MSI ≥ 8, or a ≥10bp
  homopolymer run in the variant or its flanks. Barred from Tier 1.
- **Hypervariable loci** — HLA/MHC, IGH/IGK/IGL, TCR, KIR. Shown in context
  rather than dropped.
- **Duplicate structural variants** — same SVTYPE, breakpoints within 50bp,
  SVLEN within 10%. The lower-support record is marked duplicate and its AF is
  preserved on the retained record.
- **Composite QC** — MQ < 50, NM ≥ 4, strand bias, read-position bias, long
  complex alleles. Two independent flags are required to downgrade confidence;
  one only annotates.

## Variant tiers

There is no 0–100 risk score. Each variant lands in one tier:

| Tier | Meaning |
|---|---|
| 1 | Actionable somatic — ClinVar P/LP or somatic-oncogenic or **variant-level** CIViC, build-confirmed, no germline AF pattern, QC-clean |
| 2 | Uncertain / needs review — VUS, QC-flagged, microsatellite context, gene-level-only evidence, or unvalidated caller |
| 3 | Germline pattern, clinically relevant — pathogenic but with a germline AF/zygosity pattern. A hereditary-risk finding, a *different* pathway, not a lesser one |
| 4 | Benign / common population variant / artifact |
| — | Not evaluated — the annotation stages needed to tier these did not run |

Gene-level CIViC evidence never reaches Tier 1: it means the *gene* has published
evidence, not that this variant carries it.

If a dashboard needs one number, `review_priority_count = (2 × Tier 1) + Tier 2`
is published alongside that formula. It is not a percentage or a severity score.

## Germline vs. somatic (tumor-only)

A labelled **heuristic**, not a determination:

- AF 0.45–0.55 → `putative_heterozygous_germline_pattern`
- AF ≥ 0.90 → `putative_homozygous_germline_pattern`
- Population AF > 0.01 → `common_population_variant`, which overrides any
  "urgent" framing regardless of literature association

Population frequencies come from the ClinVar VCF's `AF_ESP`/`AF_EXAC`/`AF_TGP`
fields — **not** a full gnomAD lookup. They cover only ClinVar-listed variants,
so a missing frequency does not mean a variant is rare.

If the VCF contains a matched normal, the heuristic is skipped entirely (real
tumor-normal subtraction is not yet implemented, and is reported as such).

## Supported input formats

Format is detected from file **contents**, not the extension — a file named
`.vcf` is frequently gzip-compressed in practice.

| Format | Notes |
|---|---|
| VCF | Plain, gzip, or bgzip |
| MAF | TCGA-style. Column mapping is reported in every response |
| TSV / CSV | Fuzzy header matching for chrom/pos/ref/alt and optional VAF/depth |

MAF indels written with `-` for the absent allele get an explicit `N` anchor and
a `TYPE_ANCHORED` flag, because the source doesn't supply the anchor base —
inventing sequence there would produce false database matches.

## Supported variant callers

`app/pipeline/callers/` maps each caller's conventions onto one internal shape.
An unrecognized caller is **rejected**, not guessed at — silently misreading VAF
or depth is a worse failure than an explicit rejection.

| Caller | Status |
|---|---|
| VarDict | **Validated** against a real GeneMind SURFSeq5000 panel VCF |
| Converted tables | **Validated** — our own MAF/TSV conversion, covered by tests, mapping disclosed per response |
| Mutect2 | Unvalidated — written from GATK docs, needs checking against a real file |
| Strelka2 | Unvalidated — VAF derived from tier1 counts (Strelka2 has no AF field) |
| DRAGEN | Unvalidated — assumes GATK-style FORMAT/AF, AD, DP |
| FreeBayes, VarScan2, LoFreq, GATK HaplotypeCaller, Ion Torrent | Unvalidated — read through VCF-spec-standard fields only |
| Generic fallback | Any unrecognized caller, read through spec-standard fields only. Refuses a record rather than guessing when no field carries a variant fraction |

Unvalidated adapters set `meta.caller_adapter_validated: false` and attach a
warning to every variant. Validate one before trusting it in production.

## Known limitations

- **CIViC coordinates are ~99% GRCh37.** For a GRCh38 sample, variant-level
  coordinate matching is not attempted (no liftover is performed) and results
  fall back to gene-level with that reason stated in the response. A gene-level
  match means *this gene* has published evidence — **not** that this specific
  variant does.
- **No liftover** between builds anywhere in the pipeline.
- **No full gnomAD.** Population frequencies cover ClinVar-listed variants only.
- **No tumor-normal subtraction.** Paired files are detected and the tumor-only
  heuristic is correctly skipped, but real subtraction is not implemented.
- **Gene-span panel footprints are estimates**, not capture regions: gene spans
  include introns, so the footprint is overstated and density understated.
  Upload the panel BED for an exact figure.
- **`bcftools norm` is required for correct ClinVar/CIViC joins.** Without the
  reference FASTA, normalization is skipped and coordinate joins may miss real
  matches — reported in `meta.stages`.
- **No TMB.** A targeted panel can't support it. With a panel BED present, the
  service reports `panel_mutation_density` instead, carrying a disclaimer that it
  is not comparable to whole-exome TMB.
- **Demo-grade auth only.** `/vcf/analyze` requires one shared credential
  (`ONCOTRACE_DEMO_USERNAME` / `ONCOTRACE_DEMO_PASSWORD`, see `.env.example`),
  rate-limited by nginx and backed by a fail2ban jail (`deploy/fail2ban/`).
  That suits a private demo, not real patient data: there are no per-user
  accounts or audit trail.

## Tests

```bash
.venv/bin/pip install -r requirements-dev.txt   # once
.venv/bin/python3 -m pytest tests/ -q
```

Fixtures are synthetic or reconstructed; no real patient file is committed.
`tests/fixtures/build_s5_fixture.py` regenerates the S5 fixture.

Two controls run on every test invocation:

- **`S5.panel.annotated.vcf`** — negative control. Asserts the 5-locus
  contaminant cluster is flagged (including its `PASS` member), all 12
  microsatellite indels are flagged and excluded from Tier 1, HLA/IGHJ records
  are flagged hypervariable, the duplicate KLF4 deletion collapses to one event,
  BRAF/EGFR are not falsely matched to hotspots, and **Tier 1 = 0**.
- **`positive_control_GRCh38.vcf`** — positive control. Real GRCh38 KRAS,
  PIK3CA, and BRAF V600E at tumor-only allele fractions must reach Tier 1.
  V600E gets there via ClinVar's *somatic* oncogenicity assertion, because its
  *germline* classification is "Conflicting" (germline V600E causes a
  developmental syndrome) — a case worth knowing about.

Tests requiring a reference database are skipped with a reason when it isn't
provisioned, so an unprovisioned machine cannot look like a passing one.
