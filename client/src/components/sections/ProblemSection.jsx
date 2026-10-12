import { useId, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import Reveal from "../motion/Reveal";

const PROBLEMS = [
  {
    id: "01",
    keyword: "DETECTION",
    title: "Cancer Is Still Found Too Late",
    body: "Many cancers are detected only after symptoms appear, when treatment is harder and survival is lower.",
    stat: "99%→32%",
    statLabel: "breast cancer 5-year survival, localized vs distant",
  },
  {
    id: "02",
    keyword: "SNAPSHOTS",
    title: "Monitoring Is Not Real-Time",
    body: "Cancer is usually checked through scans every few weeks, not continuously. Important changes can happen in between.",
    stat: "6–12wk",
    statLabel: "common interval between imaging assessments",
  },
  {
    id: "03",
    keyword: "INVASIVE",
    title: "Biopsy Is Hard to Repeat Often",
    body: "Tissue biopsy is invasive, burdensome, and not practical for frequent tracking over time.",
    stat: "15–25%",
    statLabel: "pneumothorax risk in some lung biopsies",
  },
  {
    id: "04",
    keyword: "RECURRENCE",
    title: "Hidden Disease Can Be Missed",
    body: "After treatment, tiny amounts of cancer can remain unseen. Relapse is often found only later on imaging.",
    stat: "Months",
    statLabel: "earlier relapse signals seen with ctDNA in some studies",
  },
  {
    id: "05",
    keyword: "FRAGMENTED",
    title: "Cancer Data Lives in Silos",
    body: "Imaging, pathology, genomics, and follow-up data often sit in separate systems, limiting a full patient view.",
    stat: "10M",
    statLabel: "global cancer deaths in 2020",
  },
];

function Tag({ p }) {
  return (
    <p className="ot-tech flex items-center gap-2 text-muted">
      <span className="text-brand">{p.id}</span>
      <span aria-hidden="true" className="h-px w-4 bg-hairline-strong" />
      {p.keyword}
    </p>
  );
}

/* Mobile: an accessible disclosure list (button + region). Height animates
   with the CSS grid-rows technique, no JS measuring. */
function MobileRow({ p }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <li className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={regionId}
        className="flex w-full items-start justify-between gap-4 py-5 text-left max-sm:py-4"
      >
        <span>
          <Tag p={p} />
          <span className="mt-2 block text-[1.0625rem] max-sm:text-[1rem] font-semibold leading-snug tracking-[-0.01em] text-ink">{p.title}</span>
        </span>
        <IconChevronDown
          size={20} stroke={1.75} aria-hidden="true"
          className={`mt-6 shrink-0 text-muted max-sm:mt-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={regionId}
        role="region"
        aria-label={p.title}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden" inert={!open || undefined}>
          <p className="ot-small pb-4">{p.body}</p>
          <div className="mb-5 flex items-baseline gap-3 rounded-lg bg-canvas px-4 py-3">
            <span className="ot-num text-[1.5rem] font-[650] text-ink">{p.stat}</span>
            <span className="text-[0.8125rem] leading-snug text-muted">{p.statLabel}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function ProblemSection() {
  const [featured, ...rest] = PROBLEMS;

  return (
    <section className="ot-section relative bg-white" aria-labelledby="problem-heading">
      <div className="ot-container">
        {/* ── Header (stacked: one focused message) ── */}
        <Reveal className="max-w-3xl">
          <p className="ot-kicker">The Problem</p>
          <h2 id="problem-heading" className="ot-h2 mt-4">
            The Challenge in Modern
            <br className="hidden sm:block" />{" "}
            Cancer <span className="text-brand">Monitoring</span>
          </h2>
          <p className="ot-lead mt-5 max-sm:mt-4">
            Cancer care is still reactive, fragmented, and delayed. Risk
            prediction, diagnosis, and monitoring often work in separate
            systems, leaving critical gaps across the patient journey.
          </p>
          <p className="ot-tech mt-5 uppercase tracking-[0.06em] text-muted max-sm:mt-4">5 critical gaps identified</p>
        </Reveal>

        {/* ── Desktop / tablet: a stat ledger. One featured gap, four rows. ── */}
        <div className="mt-12 hidden gap-6 md:grid md:grid-cols-12 lg:mt-14 lg:gap-8">
          <Reveal className="md:col-span-5">
            <article className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-8 lg:p-10">
              <div>
                <Tag p={featured} />
                <h3 className="ot-h3 mt-4">{featured.title}</h3>
                <p className="ot-body mt-3">{featured.body}</p>
              </div>
              <div className="mt-10 border-t border-hairline pt-6">
                <p className="ot-num text-[clamp(2.5rem,1.6rem+3vw,4rem)] font-[650] leading-none text-ink">{featured.stat}</p>
                <p className="ot-small mt-3 max-w-[30ch]">{featured.statLabel}</p>
              </div>
            </article>
          </Reveal>

          <ol className="md:col-span-7 md:border-t md:border-hairline">
            {rest.map((p, i) => (
              <Reveal as="li" key={p.id} delay={i * 0.06} className="grid grid-cols-[1fr_auto] gap-x-8 gap-y-2 border-b border-hairline py-6">
                <div>
                  <Tag p={p} />
                  <h3 className="mt-2.5 text-[1.125rem] font-semibold leading-snug tracking-[-0.015em] text-ink">{p.title}</h3>
                  <p className="ot-small mt-1.5 max-w-[52ch]">{p.body}</p>
                </div>
                <div className="w-[10.5rem] text-right">
                  <p className="ot-num text-[1.75rem] font-[650] leading-none text-ink">{p.stat}</p>
                  <p className="mt-2 text-[0.75rem] leading-snug text-muted">{p.statLabel}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* ── Mobile: disclosure list ── */}
        <Reveal className="mt-10 max-sm:mt-7 md:hidden">
          <ul className="border-t border-hairline">
            {PROBLEMS.map((p) => (
              <MobileRow key={p.id} p={p} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
