// Mock analysis data: powers the home page's sample report, and the dashboard
// when VITE_LB_USE_MOCK_API=true (local development without the backend).
// Shaped exactly like the FastAPI response schema (server/app/schema.py), so
// switching between mock and real data is a change to api.js only.
//
// The per-variant values below are transcribed verbatim from a real
// targeted-panel VCF (VarDict-called) used during planning. Every
// aggregate below (qc_summary, variant_type_distribution, vaf_profile, gene_summary,
// prioritization_score) is *computed* from this raw list, not hand-typed, exactly
// as the real backend's metrics.py will do — so this mock also doubles as a
// correctness check on the aggregation logic itself.

export const MOCK_VARIANTS = [
  { gene: "PTCH1", chrom: "9", pos: 95447312, ref: "G", alt: "A", type: "SNV", vaf: 0.5547, depth: 274, alt_reads: 152, mq: 60, sn: 18, hiaf: 0.5455, msi: 6, nm: 1.9, sbf: 0, oddratio: 4.32183, hicnt: 144, hicov: 264, filter: ["PASS"] },
  { gene: "KLF4", chrom: "9", pos: 107485924, ref: "C", alt: "<DEL>", type: "DEL", vaf: 0.6471, depth: 476, alt_reads: 308, mq: 60, sn: 307, hiaf: 0.4835, msi: 0, nm: 0.2, sbf: 0, oddratio: 2.11265, hicnt: 307, hicov: 635, filter: ["PASS"], svtype: "DEL", svlen: 1101, splitread: 173, spanpair: 69 },
  { gene: "KLF4", chrom: "9", pos: 107485927, ref: "C", alt: "<DEL>", type: "DEL", vaf: 0.121, depth: 463, alt_reads: 56, mq: 60, sn: 112, hiaf: 0.1141, msi: 0, nm: 1.5, sbf: 0, oddratio: 0, hicnt: 56, hicov: 491, filter: ["PASS"], svtype: "DEL", svlen: 1101, splitread: 2, spanpair: 67 },
  { gene: "EGFL7", chrom: "9", pos: 136670986, ref: "TGCAGTCCAGGGTGGACCTGCTGGAGGAGGTGAGGCATTGGTGGGGGGGGGGGGGGGCAG", alt: "T", type: "Deletion", vaf: 0.0546, depth: 293, alt_reads: 16, mq: 45.2, sn: 32, hiaf: 0.0526, msi: 2, nm: 1, sbf: 0.00032, oddratio: 10.1951, hicnt: 16, hicov: 304, filter: ["PASS"] },
  { gene: "EGFL7", chrom: "9", pos: 136671027, ref: "TG", alt: "T", type: "Deletion", vaf: 0.3853, depth: 109, alt_reads: 42, mq: 60, sn: 84, hiaf: 0.4078, msi: 15, nm: 1.3, sbf: 0.00003, oddratio: 0, hicnt: 42, hicov: 103, filter: ["PASS"] },
  { gene: "PAX8", chrom: "2", pos: 113235223, ref: "TCC", alt: "T", type: "Deletion", vaf: 0.36, depth: 850, alt_reads: 306, mq: 60, sn: 612, hiaf: 0.3669, msi: 4, nm: 0.4, sbf: 0.00545, oddratio: 1.53915, hicnt: 306, hicov: 834, filter: ["PASS"] },
  { gene: "PAX3", chrom: "2", pos: 222201298, ref: "AC", alt: "A", type: "Deletion", vaf: 0.042, depth: 714, alt_reads: 30, mq: 60, sn: 5, hiaf: 0.0388, msi: 8, nm: 1.2, sbf: 0.00146, oddratio: 4.00818, hicnt: 25, hicov: 644, filter: ["PASS"] },
  { gene: "KLRC2", chrom: "12", pos: 10435931, ref: "C", alt: "G", type: "SNV", vaf: 0.3901, depth: 1610, alt_reads: 628, mq: 51.6, sn: 124.6, hiaf: 0.3918, msi: 1, nm: 1.7, sbf: 0.00218, oddratio: 1.37003, hicnt: 623, hicov: 1590, filter: ["PASS"] },
  { gene: "ETV6", chrom: "12", pos: 11877372, ref: "A", alt: "G", type: "SNV", vaf: 0.9913, depth: 688, alt_reads: 682, mq: 60, sn: 26.28, hiaf: 1, msi: 2, nm: 1.6, sbf: 0.00783, oddratio: 0, hicnt: 657, hicov: 657, filter: ["PASS"] },
  { gene: "SH2B3", chrom: "12", pos: 111447547, ref: "ATGGGG", alt: "A", type: "Deletion", vaf: 0.2627, depth: 118, alt_reads: 31, mq: 60, sn: 62, hiaf: 0.2743, msi: 5, nm: 0.1, sbf: 0, oddratio: 0, hicnt: 31, hicov: 113, filter: ["PASS"] },
  { gene: "HNF1A", chrom: "12", pos: 120994314, ref: "G", alt: "C", type: "SNV", vaf: 0.3064, depth: 1028, alt_reads: 315, mq: 60, sn: 13.318, hiaf: 0.3071, msi: 8, nm: 1.5, sbf: 0.00003, oddratio: 1.80672, hicnt: 293, hicov: 954, filter: ["PASS"] },
  { gene: "HLA-A", chrom: "6", pos: 29943228, ref: "G", alt: "A", type: "SNV", vaf: 0.7296, depth: 233, alt_reads: 170, mq: 59.9, sn: 16, hiaf: 0.7477, msi: 4, nm: 4, sbf: 0.00161, oddratio: 2.72212, hicnt: 160, hicov: 214, filter: ["PASS"] },
  { gene: "HLA-A", chrom: "6", pos: 29943234, ref: "C", alt: "T", type: "SNV", vaf: 0.747, depth: 249, alt_reads: 186, mq: 60, sn: 6.44, hiaf: 0.7352, msi: 5, nm: 3.9, sbf: 0, oddratio: 6.16075, hicnt: 161, hicov: 219, filter: ["PASS"] },
  { gene: "HLA-A", chrom: "6", pos: 29943413, ref: "G", alt: "A", type: "SNV", vaf: 0.7844, depth: 756, alt_reads: 593, mq: 52.5, sn: 73.125, hiaf: 0.7852, msi: 2, nm: 4.3, sbf: 0.0042, oddratio: 1.70415, hicnt: 585, hicov: 745, filter: ["PASS"] },
  { gene: "HLA-A", chrom: "6", pos: 29943422, ref: "C", alt: "T", type: "SNV", vaf: 0.0823, depth: 741, alt_reads: 61, mq: 42.6, sn: 60, hiaf: 0.0814, msi: 1, nm: 6.7, sbf: 0, oddratio: 7.89453, hicnt: 60, hicov: 737, filter: ["NM5.25"] },
  { gene: "HLA-A", chrom: "6", pos: 29943426, ref: "A", alt: "C", type: "SNV", vaf: 0.0943, depth: 721, alt_reads: 68, mq: 43.6, sn: 67, hiaf: 0.0932, msi: 2, nm: 6.5, sbf: 0, oddratio: 6.32191, hicnt: 67, hicov: 719, filter: ["NM5.25"] },
  { gene: "HLA-A", chrom: "6", pos: 29943667, ref: "G", alt: "A", type: "SNV", vaf: 0.143, depth: 888, alt_reads: 127, mq: 45.1, sn: 254, hiaf: 0.1435, msi: 2, nm: 4.7, sbf: 0, oddratio: 2.7211, hicnt: 127, hicov: 885, filter: ["PASS"] },
  { gene: "HLA-A", chrom: "6", pos: 29944038, ref: "C", alt: "A", type: "SNV", vaf: 0.0286, depth: 1085, alt_reads: 31, mq: 45.1, sn: 62, hiaf: 0.0287, msi: 1, nm: 2, sbf: 0.00325, oddratio: 3.49406, hicnt: 31, hicov: 1079, filter: ["p8"] },
  { gene: "HLA-C", chrom: "6", pos: 31354625, ref: "C", alt: "T", type: "SNV", vaf: 0.5673, depth: 550, alt_reads: 312, mq: 59.9, sn: 33.667, hiaf: 0.593, msi: 2, nm: 2.7, sbf: 0, oddratio: 2.36233, hicnt: 303, hicov: 511, filter: ["PASS"] },
  { gene: "HLA-C", chrom: "6", pos: 31354682, ref: "T", alt: "C", type: "SNV", vaf: 0.5199, depth: 604, alt_reads: 314, mq: 59.8, sn: 51.333, hiaf: 0.5176, msi: 2, nm: 3.7, sbf: 0.00695, oddratio: 1.57719, hicnt: 308, hicov: 595, filter: ["PASS"] },
  { gene: "HLA-C", chrom: "6", pos: 31357074, ref: "A", alt: "AC", type: "Insertion", vaf: 0.0409, depth: 464, alt_reads: 19, mq: 60, sn: 38, hiaf: 0.05, msi: 4, nm: 5.5, sbf: 0.00446, oddratio: 5.0985, hicnt: 19, hicov: 380, filter: ["NM5.25"] },
  { gene: "QKI", chrom: "6", pos: 163570444, ref: "GT", alt: "G", type: "Deletion", vaf: 0.2645, depth: 431, alt_reads: 114, mq: 60, sn: 56, hiaf: 0.2738, msi: 16, nm: 1.6, sbf: 0, oddratio: 3.0201, hicnt: 112, hicov: 409, filter: ["MSI12", "LongMSI"] },
  { gene: "IGHJ", chrom: "14", pos: 105863732, ref: "A", alt: "G", type: "SNV", vaf: 0.0895, depth: 749, alt_reads: 67, mq: 60, sn: 134, hiaf: 0.0897, msi: 1, nm: 7, sbf: 0.00677, oddratio: 2.10579, hicnt: 67, hicov: 747, filter: ["NM5.25"] },
  { gene: "IGHJ", chrom: "14", pos: 105863740, ref: "A", alt: "G", type: "SNV", vaf: 0.0839, depth: 715, alt_reads: 60, mq: 60, sn: 29, hiaf: 0.082, msi: 2, nm: 7.2, sbf: 0.00273, oddratio: 2.41548, hicnt: 58, hicov: 707, filter: ["NM5.25"] },
  { gene: "PTPRS", chrom: "19", pos: 5260867, ref: "TGT", alt: "CG", type: "Complex", vaf: 0.3297, depth: 273, alt_reads: 90, mq: 60, sn: 89, hiaf: 0.4384, msi: 2, nm: 1.7, sbf: 0.00001, oddratio: 4.22583, hicnt: 89, hicov: 203, filter: ["PASS"] },
  { gene: "DNM2", chrom: "19", pos: 10797475, ref: "TGGTCTCAGAGCTGGCCACGG", alt: "GTGGTCGCCGTA", type: "Complex", vaf: 0.0144, depth: 904, alt_reads: 13, mq: 60, sn: 26, hiaf: 0.015, msi: 3, nm: 1.5, sbf: 0.00002, oddratio: 0, hicnt: 13, hicov: 866, filter: ["Bias"] },
  { gene: "NF1", chrom: "17", pos: 31236055, ref: "T", alt: "TTG", type: "Insertion", vaf: 0.7197, depth: 603, alt_reads: 434, mq: 60, sn: 216, hiaf: 1, msi: 6, nm: 1.3, sbf: 0.0063, oddratio: 1.6529, hicnt: 432, hicov: 432, filter: ["PASS"] },
  { gene: "NF1", chrom: "17", pos: 31236067, ref: "T", alt: "G", type: "SNV", vaf: 0.7421, depth: 535, alt_reads: 397, mq: 60, sn: 27.357, hiaf: 0.7599, msi: 13, nm: 1.3, sbf: 0.00406, oddratio: 1.80467, hicnt: 383, hicov: 504, filter: ["PASS"] },
  { gene: "SUZ12", chrom: "17", pos: 31966130, ref: "C", alt: "CT", type: "Insertion", vaf: 0.2918, depth: 586, alt_reads: 171, mq: 59.9, sn: 41.75, hiaf: 0.5719, msi: 15, nm: 1.5, sbf: 0.0003, oddratio: 2.01384, hicnt: 167, hicov: 292, filter: ["PASS"] },
  { gene: "ETV4", chrom: "17", pos: 43543276, ref: "A", alt: "ACTCT", type: "Insertion", vaf: 0.6105, depth: 285, alt_reads: 174, mq: 60, sn: 173, hiaf: 1, msi: 12, nm: 0.2, sbf: 0.00098, oddratio: 2.95832, hicnt: 173, hicov: 173, filter: ["PASS"] },
  { gene: "AXIN2", chrom: "17", pos: 65536436, ref: "ACGGGGGGTGGTG", alt: "A", type: "Deletion", vaf: 0.0298, depth: 571, alt_reads: 17, mq: 60, sn: 34, hiaf: 0.0367, msi: 2, nm: 0, sbf: 0.00167, oddratio: 5.02899, hicnt: 17, hicov: 463, filter: ["PASS"] },
  { gene: "GRIN2A", chrom: "16", pos: 9764198, ref: "TGTCTCTAGGGGAGCTTGATTTGGTTTTCAGGTAGGT", alt: "CGGTGGTCGCCGTATCATTAAAAAAAAAAAGATAGGA", type: "Complex", vaf: 0.0324, depth: 709, alt_reads: 23, mq: 60, sn: 10.5, hiaf: 0.032, msi: 2, nm: 0.1, sbf: 0, oddratio: 0, hicnt: 21, hicov: 657, filter: ["Bias"] },
  { gene: "GRIN2A", chrom: "16", pos: 9840834, ref: "G", alt: "A", type: "SNV", vaf: 0.4977, depth: 221, alt_reads: 110, mq: 58.1, sn: 14.714, hiaf: 0.7464, msi: 6, nm: 1.4, sbf: 0, oddratio: 18.3188, hicnt: 103, hicov: 138, filter: ["PASS"] },
  { gene: "FGFR4", chrom: "5", pos: 177090796, ref: "C", alt: "T", type: "SNV", vaf: 0.9758, depth: 579, alt_reads: 565, mq: 60, sn: 23.565, hiaf: 0.9927, msi: 4, nm: 1.2, sbf: 0.00507, oddratio: 10.74, hicnt: 542, hicov: 546, filter: ["PASS"] },
  { gene: "ATRX", chrom: "X", pos: 77682285, ref: "C", alt: "T", type: "SNV", vaf: 0.0193, depth: 519, alt_reads: 10, mq: 48.6, sn: 9, hiaf: 0.018, msi: 2, nm: 1.9, sbf: 0.0004, oddratio: 0, hicnt: 9, hicov: 500, filter: ["PASS"] },
  { gene: "SMAD4", chrom: "18", pos: 51058485, ref: "A", alt: "ATT", type: "Insertion", vaf: 0.4293, depth: 1258, alt_reads: 540, mq: 60, sn: 178.667, hiaf: 1, msi: 18, nm: 1.6, sbf: 0, oddratio: 2.29704, hicnt: 536, hicov: 536, filter: ["PASS"] },
  { gene: "C11ORF95", chrom: "11", pos: 63764229, ref: "GAGCCCGGGTGGCGCCGGCGGATGTGGCGCTCG", alt: "TAGATCTCGGTGGTCGCCGTATCATTAAAAAAAAA", type: "Complex", vaf: 0.0148, depth: 742, alt_reads: 11, mq: 60, sn: 22, hiaf: 0.0151, msi: 0, nm: 0.5, sbf: 0.00145, oddratio: 0, hicnt: 11, hicov: 730, filter: ["PASS"] },
  { gene: "CYP2D6", chrom: "22", pos: 42129819, ref: "G", alt: "T", type: "SNV", vaf: 0.2843, depth: 1175, alt_reads: 334, mq: 55.1, sn: 14.182, hiaf: 0.2734, msi: 2, nm: 3.5, sbf: 0.00436, oddratio: 1.4554, hicnt: 312, hicov: 1141, filter: ["PASS"] },
  { gene: "EGFR", chrom: "7", pos: 55167263, ref: "G", alt: "T", type: "SNV", vaf: 0.8787, depth: 3067, alt_reads: 2695, mq: 42, sn: 13.647, hiaf: 0.9472, msi: 4, nm: 2.2, sbf: 0, oddratio: 2.6617, hicnt: 2511, hicov: 2651, filter: ["PASS"] },
  { gene: "CUX1", chrom: "7", pos: 102257306, ref: "C", alt: "CTT", type: "Insertion", vaf: 0.2077, depth: 886, alt_reads: 184, mq: 60, sn: 183, hiaf: 0.3704, msi: 13, nm: 1.4, sbf: 0, oddratio: 3.77581, hicnt: 183, hicov: 494, filter: ["PASS"] },
  { gene: "CUX1", chrom: "7", pos: 102282795, ref: "G", alt: "T", type: "SNV", vaf: 0.3527, depth: 258, alt_reads: 91, mq: 60, sn: 17.2, hiaf: 0.3644, msi: 7, nm: 1.4, sbf: 0.00002, oddratio: 6.16802, hicnt: 86, hicov: 236, filter: ["PASS"] },
  { gene: "BRAF", chrom: "7", pos: 140798272, ref: "C", alt: "T", type: "SNV", vaf: 0.2218, depth: 239, alt_reads: 53, mq: 45.7, sn: 52, hiaf: 0.437, msi: 8, nm: 1.3, sbf: 0, oddratio: 91.5227, hicnt: 52, hicov: 119, filter: ["PASS"] },
  { gene: "FGFR1", chrom: "8", pos: 38414583, ref: "CGGTCAAATAATGCCTCGGGTGCCATCCACTT", alt: "TCGGTGGTCGCCGTATCATTAAAAAAAAAATA", type: "Complex", vaf: 0.0319, depth: 595, alt_reads: 19, mq: 60, sn: 38, hiaf: 0.0363, msi: 2, nm: 0.2, sbf: 0, oddratio: 0, hicnt: 19, hicov: 523, filter: ["Bias"] },
  { gene: "FGFR1", chrom: "8", pos: 38427091, ref: "AGTGAGACTCCGTCT", alt: "TGAGACTCCGTCTA", type: "Complex", vaf: 0.227, depth: 163, alt_reads: 37, mq: 58.9, sn: 74, hiaf: 0.2313, msi: 1, nm: 2.3, sbf: 0.00047, oddratio: 9.46522, hicnt: 37, hicov: 160, filter: ["PASS"] },
  { gene: "FGFR1", chrom: "8", pos: 38466895, ref: "AC", alt: "A", type: "Deletion", vaf: 0.7608, depth: 439, alt_reads: 334, mq: 60, sn: 333, hiaf: 0.8043, msi: 10, nm: 0.6, sbf: 0, oddratio: 111.022, hicnt: 333, hicov: 414, filter: ["PASS"] },
  { gene: "MYC", chrom: "8", pos: 127739018, ref: "T", alt: "<DEL>", type: "DEL", vaf: 0.7738, depth: 831, alt_reads: 643, mq: 60, sn: 642, hiaf: 0.4605, msi: 0, nm: 0.1, sbf: 0.00012, oddratio: 1.50978, hicnt: 642, hicov: 1394, filter: ["PASS"], svtype: "DEL", svlen: 1376, splitread: 486, spanpair: 157 },
  { gene: "PHOX2B", chrom: "4", pos: 41747411, ref: "GGTAGTGAGTCTCCGCGAAGACCCTT", alt: "TGGTCGCCGTATCATTAAAAAAAAAA", type: "Complex", vaf: 0.0374, depth: 589, alt_reads: 22, mq: 60, sn: 10, hiaf: 0.0366, msi: 3, nm: 2, sbf: 0, oddratio: 0, hicnt: 20, hicov: 547, filter: ["Bias"] },
  { gene: "FAT1", chrom: "4", pos: 186596604, ref: "G", alt: "A", type: "SNV", vaf: 0.0641, depth: 577, alt_reads: 37, mq: 60, sn: 36, hiaf: 0.0667, msi: 5, nm: 1.3, sbf: 0, oddratio: 6.49054, hicnt: 36, hicov: 540, filter: ["PASS"] },
  { gene: "TMPRSS2", chrom: "21", pos: 41495067, ref: "CAA", alt: "C", type: "Deletion", vaf: 0.2758, depth: 330, alt_reads: 91, mq: 59.7, sn: 17.2, hiaf: 0.3127, msi: 16, nm: 0.8, sbf: 0, oddratio: 5.49964, hicnt: 86, hicov: 275, filter: ["PASS"] },
];

const FILTER_DESCRIPTIONS = {
  PASS: "All filters passed",
  "q22.5": "Mean Base Quality Below 22.5",
  Q10: "Mean Mapping Quality Below 10",
  p8: "Mean Position in Reads < 8",
  "SN1.5": "Signal to Noise < 1.5",
  Bias: "Strand bias detected",
  pSTD: "Position in Reads has STD of 0",
  d3: "Total Depth < 3",
  v2: "Variant Depth < 2",
  "f0.01": "Allele Frequency < 1%",
  MSI12: "Variant in MSI region ≥12 non-monomer or ≥13 monomer",
  "NM5.25": "Mean mismatches ≥5.25 (likely false positive)",
  InGap: "Variant in deletion gap",
  InIns: "Variant adjacent to insertion",
  Cluster0bp: "Two variants within 0 bp",
  LongMSI: "Somatic variant flanked by long A/T (≥14 bp)",
  AMPBIAS: "Variant has amplicon bias",
};

// General, gene-level oncology literature associations (real, well-established drug
// classes) — NOT a per-variant clinical evidence-database lookup. In the real
// backend this is what a `match_level: "gene"` CIViC hit looks like: the gene has
// published relevance, but this specific called variant hasn't been confirmed
// against a curated evidence entry. Every other gene in this panel gets
// `match_level: "none"` below, which is the expected, honest outcome for most of
// a broad panel like this one.
const GENE_EVIDENCE = {
  EGFR: { pathway: "EGFR / RAS / MAPK", role: "Oncogene", therapies: ["Erlotinib", "Gefitinib", "Afatinib", "Osimertinib"], note: "EGFR-activating mutations are a well-documented driver across several solid tumor types, with multiple approved TKIs." },
  FGFR4: { pathway: "FGFR4 / FGF19 / PI3K", role: "Oncogene", therapies: ["Fisogatinib", "Futibatinib"], note: "FGFR4 alterations are studied in rhabdomyosarcoma and hepatocellular carcinoma; several FGFR inhibitors are in clinical use or trials." },
  ETV6: { pathway: "ETS transcription / hematopoiesis", role: "Tumor suppressor", therapies: [], note: "ETV6 is best known as a rearrangement partner in hematologic malignancies; no gene-targeted therapy exists." },
  MYC: { pathway: "MYC / cell cycle / transcription", role: "Oncogene", therapies: ["BET bromodomain inhibitors (investigational)"], note: "MYC dysregulation is broadly associated with aggressive tumor behavior; direct MYC-targeted drugs remain investigational." },
  NF1: { pathway: "RAS / MAPK", role: "Tumor suppressor", therapies: ["Trametinib", "Cobimetinib", "Binimetinib"], note: "NF1 loss activates the RAS/MAPK pathway; MEK inhibitors are used in NF1-associated tumors." },
  FGFR1: { pathway: "FGFR / PI3K / MAPK", role: "Oncogene", therapies: ["Erdafitinib", "Pemigatinib", "Futibatinib"], note: "FGFR1 amplification/alteration is reported in lung squamous, bladder, and breast cancers; FGFR inhibitors are approved in some contexts." },
  BRAF: { pathway: "MAPK / MEK / ERK", role: "Oncogene", therapies: ["Vemurafenib", "Dabrafenib", "Encorafenib"], note: "BRAF mutations (most commonly V600E, not confirmed here) are targetable with BRAF/MEK inhibitor combinations." },
  SMAD4: { pathway: "TGF-β / BMP signaling", role: "Tumor suppressor", therapies: [], note: "SMAD4 loss is associated with pancreatic and colorectal cancer and reported anti-EGFR resistance in CRC; no direct targeted therapy exists." },
};

function round(n, dp = 4) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function buildQcSummary(variants) {
  const total = variants.length;
  const flagCounts = new Map();
  let passCount = 0;
  variants.forEach((v) => {
    const isPass = v.filter.length === 1 && v.filter[0] === "PASS";
    if (isPass) passCount += 1;
    v.filter.forEach((f) => flagCounts.set(f, (flagCounts.get(f) || 0) + 1));
  });
  const depths = variants.map((v) => v.depth);
  const mqs = variants.map((v) => v.mq);
  return {
    total_records: total,
    pass_count: passCount,
    non_pass_count: total - passCount,
    pass_rate: round(passCount / total),
    filter_flag_counts: Array.from(flagCounts.entries()).map(([flag, count]) => ({
      flag, count, description: FILTER_DESCRIPTIONS[flag] || "",
    })),
    depth: { mean: round(depths.reduce((a, b) => a + b, 0) / total, 1), min: Math.min(...depths), max: Math.max(...depths) },
    mapping_quality: { mean: round(mqs.reduce((a, b) => a + b, 0) / total, 1), min: Math.min(...mqs), max: Math.max(...mqs) },
    strand_bias_flag_count: variants.filter((v) => v.filter.includes("Bias")).length,
    msi_elevated_count: variants.filter((v) => v.msi >= 6 && v.msi < 12).length,
    msi_high_count: variants.filter((v) => v.msi >= 12).length,
    high_mismatch_count: variants.filter((v) => v.nm >= 5.25).length,
  };
}

function buildVariantTypeDistribution(variants) {
  const counts = new Map();
  variants.forEach((v) => counts.set(v.type, (counts.get(v.type) || 0) + 1));
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

function buildChromosomeDistribution(variants) {
  const counts = new Map();
  variants.forEach((v) => counts.set(v.chrom, (counts.get(v.chrom) || 0) + 1));
  const order = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","X","Y"];
  return order.filter((c) => counts.has(c)).map((chrom) => ({ chrom, count: counts.get(chrom) }));
}

function buildVafProfile(variants) {
  const buckets = [
    { range: "0–10%", min: 0, max: 0.1 },
    { range: "10–20%", min: 0.1, max: 0.2 },
    { range: "20–30%", min: 0.2, max: 0.3 },
    { range: "30–50%", min: 0.3, max: 0.5 },
    { range: "50–70%", min: 0.5, max: 0.7 },
    { range: "70–90%", min: 0.7, max: 0.9 },
    { range: "90–100%", min: 0.9, max: 1.001 },
  ];
  const histogram = buckets.map((b) => ({
    range: b.range,
    count: variants.filter((v) => v.vaf >= b.min && v.vaf < b.max).length,
  }));
  const vafs = variants.map((v) => v.vaf).sort((a, b) => a - b);
  const mid = Math.floor(vafs.length / 2);
  const median = vafs.length % 2 ? vafs[mid] : (vafs[mid - 1] + vafs[mid]) / 2;
  const mean = vafs.reduce((a, b) => a + b, 0) / vafs.length;
  return {
    histogram,
    median: round(median),
    mean: round(mean),
    min: round(Math.min(...vafs)),
    max: round(Math.max(...vafs)),
    tiers: {
      clonal_ge_30pct: variants.filter((v) => v.vaf >= 0.3).length,
      subclonal_5_30pct: variants.filter((v) => v.vaf >= 0.05 && v.vaf < 0.3).length,
      low_fraction_lt_5pct: variants.filter((v) => v.vaf < 0.05).length,
    },
    note: "VAF tier alone cannot distinguish tissue from plasma-derived (ctDNA) samples without paired sample-type metadata, which this file does not carry.",
  };
}

function buildGeneSummary(variants) {
  const byGene = new Map();
  variants.forEach((v) => {
    if (!byGene.has(v.gene)) byGene.set(v.gene, []);
    byGene.get(v.gene).push(v);
  });
  return Array.from(byGene.entries())
    .map(([gene, vs]) => {
      const vafs = vs.map((v) => v.vaf);
      const evidence = GENE_EVIDENCE[gene];
      return {
        gene,
        variant_count: vs.length,
        max_vaf: round(Math.max(...vafs)),
        mean_vaf: round(vafs.reduce((a, b) => a + b, 0) / vafs.length),
        // Field names match the real backend's gene_summary rows exactly, so
        // pages behave identically in mock and live mode.
        clinvar_max_significance: null,
        civic_variant_level_actionable: false,
        civic_gene_level_evidence: Boolean(evidence),
      };
    })
    .sort((a, b) => b.max_vaf - a.max_vaf);
}

function buildActionabilitySummary(geneSummary) {
  const genes = geneSummary
    .filter((g) => g.civic_gene_level_evidence || g.civic_variant_level_actionable)
    .map((g) => ({
      gene: g.gene,
      match_level: g.civic_variant_level_actionable ? "variant" : "gene",
      evidence_summary: [GENE_EVIDENCE[g.gene].note],
      therapies: GENE_EVIDENCE[g.gene].therapies,
    }));
  return {
    variant_level_actionable_gene_count: genes.filter((g) => g.match_level === "variant").length,
    gene_level_evidence_count: genes.filter((g) => g.match_level === "gene").length,
    genes,
    disclaimer: "Actionability annotations here are general, gene-level literature associations for demo purposes — not a curated evidence-database lookup (e.g. CIViC) confirmed against this exact variant, and not a substitute for molecular tumor board review.",
  };
}

function buildTierSummary(variants) {
  // Demo mode runs no annotation, so nothing can legitimately be tiered --
  // every variant lands in not_evaluated rather than defaulting to "nothing found".
  const counts = {
    tier_1_actionable_somatic: 0,
    tier_2_uncertain_needs_review: 0,
    tier_3_germline_pattern_clinically_relevant: 0,
    tier_4_benign_or_artifact: 0,
    not_evaluated: variants.length,
  };
  return {
    counts,
    definitions: {
      tier_1_actionable_somatic:
        "ClinVar Pathogenic/Likely-pathogenic or variant-level CIViC support, on a confirmed build, without a germline allele-fraction pattern, and QC-clean.",
      tier_2_uncertain_needs_review:
        "Uncertain significance, QC-flagged, microsatellite/homopolymer context, or single unvalidated caller.",
      tier_3_germline_pattern_clinically_relevant:
        "Pathogenic but with a germline allele-fraction pattern — a hereditary-risk finding, a different clinical pathway.",
      tier_4_benign_or_artifact:
        "Benign, likely benign, common population variant, or flagged as a technical artifact.",
      not_evaluated: "The annotation stages needed to tier these variants did not run.",
    },
    review_priority_count: 2 * counts.tier_1_actionable_somatic + counts.tier_2_uncertain_needs_review,
    review_priority_formula:
      "review_priority_count = (2 x Tier 1 count) + (1 x Tier 2 count). A weighted count of variants needing review — NOT a percentage and NOT a severity score.",
  };
}


export function buildMockAnalysis() {
  const variants = MOCK_VARIANTS;
  const qc_summary = buildQcSummary(variants);
  const variant_type_distribution = buildVariantTypeDistribution(variants);
  const chromosome_distribution = buildChromosomeDistribution(variants);
  const vaf_profile = buildVafProfile(variants);
  const gene_summary = buildGeneSummary(variants);
  const actionability_summary = buildActionabilitySummary(gene_summary);
  const tier_summary = buildTierSummary(variants);
  const structural_variants = variants.filter((v) => v.svtype);

  return {
    meta: {
      sample_id: "S5",
      source_filename: "S5.panel.annotated.vcf",
      vcf_format_version: "VCFv4.2",
      caller: "VarDict v1.8.2",
      reference_build: "UNRESOLVED",
      reference_build_source: "unresolved",
      reference_build_confirmed: false,
      caller_adapter: "demo",
      caller_adapter_validated: false,
      caller_adapter_warning:
        "Demo mode: no analysis backend is connected, so nothing in this view was computed from an uploaded file.",
      input_format: "vcf",
      provenance: { checklist: [], references: [], missing_count: 0 },
      panel_name: "Targeted Oncology Panel",
      panel_footprint_mb: null,
      panel_gene_count: gene_summary.length,
      annotation_versions: { snpeff_db: "demo mode — no backend connected", clinvar_release: "demo mode", civic_release: "demo mode" },
      analysis_timestamp: new Date().toISOString(),
      stages: {
        input_conversion: { status: "skipped_unsupported", detail: "not needed: input was already VCF" },
        structural_validation: { status: "ran", detail: "demo mode" },
        parsing: { status: "ran", detail: `${MOCK_VARIANTS.length} record(s) (demo fixture)` },
        provenance_mining: { status: "skipped_unsupported", detail: "demo mode — no backend connected" },
        reference_build_resolution: { status: "skipped_unsupported", detail: "demo mode — no backend connected" },
        normalization: { status: "skipped_missing_input", detail: "demo mode — no backend connected" },
        qc_artifact_flagging: { status: "skipped_missing_input", detail: "demo mode — no backend connected" },
        functional_annotation: { status: "skipped_missing_input", detail: "demo mode — no backend connected" },
        clinical_significance: { status: "skipped_missing_input", detail: "demo mode — no backend connected" },
        actionability: { status: "skipped_missing_input", detail: "demo mode — no backend connected" },
        germline_somatic_pattern: { status: "skipped_unsupported", detail: "demo mode — no backend connected" },
        panel_footprint: { status: "skipped_missing_input", detail: "demo mode — no panel BED" },
        tier_classification: { status: "skipped_unsupported", detail: "demo mode — nothing to tier" },
      },
      disclaimer: "Demo response from a local mock — no analysis backend is connected. Every number here is computed from a real sample VCF's variant calls, but functional/clinical annotation (SnpEff/ClinVar/CIViC) has not been run. This is a research prototype, not a validated clinical tool.",
    },
    qc_summary,
    variant_type_distribution,
    chromosome_distribution,
    vaf_profile,
    variants,
    structural_variants,
    gene_summary,
    actionability_summary,
    tier_summary,
    qc_flag_summary: {
      contamination_candidates: 0,
      contamination_motifs: [],
      microsatellite_by_msi_field: 0,
      hypervariable_region: 0,
      duplicate_representation: 0,
      confidence_downgraded: 0,
      note: "Demo mode: the QC/artifact layer did not run, so these are not zero findings — they are no findings computed.",
    },
    germline_summary: {
      applied: false,
      reason: "Demo mode: no analysis backend is connected, so the germline/somatic heuristic did not run.",
    },
    germline_pairing: { paired: false, normal_sample: null, basis: "demo mode" },
    patient_summary: {
      genes_tested: gene_summary.length,
      genes_with_findings: gene_summary.filter((g) => g.max_vaf >= 0.2).length,
      genes_with_variant_level_evidence: actionability_summary.variant_level_actionable_gene_count,
      gene_cards: [
        { gene: "EGFR", plain_name: "Epidermal Growth Factor Receptor", finding: "A change found in a large proportion of cells tested (88%).", why: "There are approved medicines targeting this general class of change.", action: "Worth discussing EGFR-targeted therapy eligibility with an oncologist.", evidence_basis: "gene" },
        { gene: "BRAF", plain_name: "B-Raf Proto-Oncogene", finding: "A change found in about 22% of cells tested.", why: "BRAF mutations can, in some cases, be targeted by specific medicines.", action: "Worth discussing BRAF-targeted therapy evaluation.", evidence_basis: "gene" },
        { gene: "FGFR1 / FGFR4", plain_name: "Fibroblast Growth Factor Receptors", finding: "Changes found in both FGFR1 and FGFR4 at high proportions.", why: "FGFR inhibitor drugs exist and are being studied for this gene family.", action: "Worth discussing FGFR inhibitor eligibility.", evidence_basis: "gene" },
        { gene: "MYC", plain_name: "MYC Proto-Oncogene", finding: "A large piece of this gene is deleted in approximately 77% of cells.", why: "MYC changes are broadly linked to aggressive cancer behavior in the literature.", action: "Worth discussing clinical trial options.", evidence_basis: "gene" },
        { gene: "NF1", plain_name: "Neurofibromatosis Type 1 Gene", finding: "Changes found in ~72–74% of cells.", why: "Loss of NF1 can make some MEK inhibitor drugs effective.", action: "Worth discussing MEK inhibitor therapy.", evidence_basis: "gene" },
        { gene: "SMAD4", plain_name: "SMAD Family Member 4", finding: "A change found in approximately 43% of cells.", why: "Reported relevance in pancreatic/colorectal cancers.", action: "Worth discussing with a treating oncologist.", evidence_basis: "gene" },
      ],
      next_steps: [
        "A treating physician reviews all findings in the context of the full clinical picture.",
        "A multidisciplinary tumor board may discuss complex or high-priority findings.",
        "Additional orthogonal testing may confirm findings before any treatment decision.",
        "Follow-up testing may be used to monitor changes over time.",
      ],
    },
    technical_report: {
      filter_definitions: Object.entries(FILTER_DESCRIPTIONS).map(([flag, description]) => ({ flag, description })),
      field_glossary: [
        { field: "VAF", full_name: "Variant Allele Frequency", definition: "Fraction of reads supporting the alt allele (VD/DP). Typical somatic heterozygous: ~50%." },
        { field: "DP (Depth)", full_name: "Total Read Depth", definition: "Total reads at the variant position. Adequate ≥100×, good ≥500×, excellent ≥1000×." },
        { field: "MQ", full_name: "Mean Mapping Quality", definition: "Average mapping quality of supporting reads. MQ=60 is perfectly unique; ≥30 is acceptable." },
        { field: "SN", full_name: "Signal-to-Noise Ratio", definition: "Ratio of variant-supporting reads to background. Good: ≥10, acceptable: ≥1.5." },
        { field: "HIAF", full_name: "High-Quality Allele Frequency", definition: "VAF computed using only high-quality bases; large divergence from VAF suggests a base-quality issue." },
        { field: "MSI", full_name: "Microsatellite Instability Score", definition: "Score >1 indicates the variant sits in a microsatellite region. ≥12 triggers the MSI12 filter." },
        { field: "NM", full_name: "Mean Mismatches per Read", definition: "Average mismatches in supporting reads. ≥5.25 triggers the NM5.25 filter." },
        { field: "SBF", full_name: "Strand Bias Fisher p-value", definition: "Low p-value indicates potential strand-specific bias; interpreted together with Odds Ratio." },
        { field: "ODDRATIO", full_name: "Strand Bias Odds Ratio", definition: "Odds ratio of forward vs. reverse strand support. >5 with SBF<0.05 suggests artefact risk." },
        { field: "HICNT / HICOV", full_name: "High-Quality Reads / Coverage", definition: "High-quality variant-supporting reads and total high-quality coverage at the position." },
      ],
      pipeline: {
        parser: "cyvcf2 (planned)", normalization: "bcftools norm (planned)", annotator: "SnpEff (planned, not run in demo mode)",
        clinvar_join: "bcftools annotate (planned, not run in demo mode)", civic_join: "local cache join (planned, not run in demo mode)",
      },
    },
  };
}
