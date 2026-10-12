// LungImagingSection.jsx
import { IconArrowRight } from "@tabler/icons-react";
import Reveal from "../motion/Reveal";
import { Button } from "../ui/Button";
import { scrollToSection } from "../../lib/scroll";
import { CT_SIZE, LESION, LESION_SIZE, LUNG_FIELDS } from "./lungCtOverlay";
import "./LungImagingSection.css";

/* AI lung cancer imaging (CT). In development: the lead says so, and the
   section's only action is a conversation (the contact form), never a
   booking.

   Images (credited in the site footer):
   - /lung/lung-ct-axial*.webp: "CT-Thorax-5.0-B70f-Lungs" by Ptrump16,
     Wikimedia Commons, CC BY-SA 4.0 (cropped). The lung outlines drawn over
     it are traced from the image itself (lungCtOverlay.js).
   - /lung/lung-ct-lesion.webp: "CT scan of lung cancer with cavitation" by
     Jmarchn, Wikimedia Commons, CC0. */

const STEPS = [
  {
    step: "01",
    label: "Upload a CT scan",
    desc: "Low-dose screening or diagnostic chest CT, as a standard DICOM series.",
  },
  {
    step: "02",
    label: "Detect and outline nodules",
    desc: "AI reads every slice to find lung nodules and outline them in 3D.",
  },
  {
    step: "03",
    label: "Estimate risk",
    desc: "Size, density and shape feed a malignancy-risk estimate aligned with Lung-RADS® categories.",
  },
  {
    step: "04",
    label: "Track change over time",
    desc: "Comparing scans measures nodule growth and volume-doubling time.",
  },
];

const GLOBOCAN = { label: "GLOBOCAN 2022", href: "https://doi.org/10.3322/caac.21834" };
const EVIDENCE = [
  {
    value: "2.5M",
    text: "people were diagnosed with lung cancer worldwide in 2022, the most common cancer.",
    sources: [GLOBOCAN],
  },
  {
    value: "1.8M",
    text: "deaths from lung cancer in 2022, the leading cause of cancer death.",
    sources: [GLOBOCAN],
  },
  {
    value: "20–24%",
    text: "fewer lung cancer deaths with low-dose CT screening in large randomised trials.",
    sources: [
      { label: "NLST 2011", href: "https://doi.org/10.1056/NEJMoa1102873" },
      { label: "NELSON 2020", href: "https://doi.org/10.1056/NEJMoa1911793" },
    ],
  },
];

/* A radiology-style viewer over a real chest CT: the lung fields, segmented
   from the image, draw themselves in as the viewer scrolls into view, and a
   slow scan line passes over the slice. Purely illustrative. */
function CtViewer() {
  return (
    <figure className="lung-viewer">
      <div className="lung-viewer-frame ot-night">
        <div className="lung-viewer-bar">
          <span className="flex items-center gap-2">
            <span className="lung-live" aria-hidden="true" />
            Chest CT · Axial
          </span>
          <span className="max-[420px]:hidden">Lung window · W1500 / L−600</span>
        </div>

        <div className="lung-viewer-stage">
          <img
            src="/lung/lung-ct-axial.webp"
            srcSet="/lung/lung-ct-axial-640.webp 640w, /lung/lung-ct-axial.webp 1000w"
            sizes="(min-width: 1024px) 52vw, 100vw"
            width={CT_SIZE.width}
            height={CT_SIZE.height}
            alt="Axial chest CT scan in the lung window, with both lung fields outlined"
            loading="lazy"
            decoding="async"
          />
          <svg
            className="lung-viewer-overlay"
            viewBox={`0 0 ${CT_SIZE.width} ${CT_SIZE.height}`}
            aria-hidden="true"
            focusable="false"
          >
            {LUNG_FIELDS.map((d, i) => (
              <path key={i} d={d} pathLength="1" className="lung-field" />
            ))}
          </svg>
          <span className="lung-scan" aria-hidden="true" />
          <span className="lung-corners" aria-hidden="true" />
          <span className="lung-tag" aria-hidden="true">Lung fields segmented</span>
          {/* Radiological convention: the patient's right is on the viewer's left. */}
          <span className="lung-side lung-side--r" aria-hidden="true">R</span>
          <span className="lung-side lung-side--l" aria-hidden="true">L</span>
        </div>

        {/* The disclaimer stays on the left: on desktop the finding card
            overlaps the bar's right end, where the (decorative) scan details
            sit; those are dropped on narrow phones. */}
        <div className="lung-viewer-bar lung-viewer-bar--foot">
          <span>Illustrative · not a diagnosis</span>
          <span className="max-[480px]:hidden lg:invisible">Slice 5.0 mm · 120 kV</span>
        </div>
      </div>

      <div className="lung-finding">
        <div className="lung-finding-media">
          <img
            src="/lung/lung-ct-lesion.webp"
            width={LESION_SIZE.width}
            height={LESION_SIZE.height}
            alt="Chest CT slice showing a cavitating tumour in the left lower lobe, circled"
            loading="lazy"
            decoding="async"
          />
          <svg viewBox={`0 0 ${LESION_SIZE.width} ${LESION_SIZE.height}`} aria-hidden="true" focusable="false">
            <circle cx={LESION.x} cy={LESION.y} r={LESION.r} className="lung-finding-ring" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="ot-tech uppercase tracking-[0.08em] text-brand">Example finding</p>
          <p className="mt-1 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
            Cavitating tumour, left lower lobe
          </p>
          <p className="mt-1 text-[0.75rem] leading-snug text-muted">Separate public case · illustrative</p>
        </div>
      </div>
    </figure>
  );
}

export default function LungImagingSection() {
  return (
    <section className="ot-section lung-section relative overflow-hidden border-t border-hairline bg-white" aria-labelledby="lung-heading">
      <div className="ot-container relative">
        {/* ── Section header ── */}
        <Reveal className="max-w-[46rem]">
          <p className="ot-kicker">AI Lung Cancer Imaging</p>
          <h2 id="lung-heading" className="ot-h2 mt-4">
            AI-Powered <span className="text-brand">Lung Cancer</span> Analysis
          </h2>
          <p className="ot-lead mt-5 max-sm:mt-4">
            Low-dose CT screening finds lung cancer early, when treatment works
            best. We are developing AI that reads chest CT scans to find,
            measure and track lung nodules, so radiologists can focus on what
            matters most.
          </p>
        </Reveal>

        {/* ── CT viewer + how it works ── */}
        <div className="mt-8 grid grid-cols-1 items-center gap-10 sm:mt-12 lg:mt-14 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <CtViewer />
          </Reveal>

          <Reveal className="lg:col-span-5" delay={0.08}>
            <p className="ot-kicker">How it works</p>
            <h3 className="mt-3 text-[clamp(1.375rem,1.1rem+1.1vw,2rem)] font-[650] leading-[1.15] tracking-[-0.025em] text-ink">
              From CT scan to <span className="text-brand">risk insight</span>
            </h3>

            <ol className="mt-7 border-l border-hairline max-sm:mt-6">
              {STEPS.map((s) => (
                <li key={s.step} className="relative pb-6 pl-7 last:pb-0">
                  <span
                    className="absolute -left-[13px] top-0 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-brand-line bg-white ot-tech text-[11px] text-brand"
                    aria-hidden="true"
                  >
                    {s.step}
                  </span>
                  <h4 className="pt-0.5 text-[1rem] font-semibold tracking-[-0.01em] text-ink">{s.label}</h4>
                  <p className="ot-small mt-1">{s.desc}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 max-sm:mt-7">
              <Button variant="primary" onClick={() => scrollToSection("cta")}>
                Talk to us about Lung AI
                <IconArrowRight size={17} stroke={1.75} aria-hidden="true" />
              </Button>
            </div>
          </Reveal>
        </div>

        {/* ── Why it matters: cited evidence ── */}
        <Reveal className="mt-14 sm:mt-16 lg:mt-20">
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline md:grid-cols-3" aria-label="Lung cancer in numbers">
            {EVIDENCE.map((e) => (
              <li key={e.value} className="flex flex-col bg-white p-6 sm:p-7">
                <p className="ot-num text-[clamp(2rem,1.55rem+1.6vw,2.75rem)] font-[650] leading-none tracking-[-0.03em] text-ink">
                  {e.value}
                </p>
                <p className="ot-small mt-3 max-w-[34ch] flex-1">{e.text}</p>
                <p className="ot-tech mt-5 text-[11px] text-muted">
                  Source:{" "}
                  {e.sources.map((s, i) => (
                    <span key={s.href}>
                      {i > 0 && " · "}
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded underline decoration-hairline-strong underline-offset-2 transition-colors hover:text-brand hover:decoration-brand"
                      >
                        {s.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
