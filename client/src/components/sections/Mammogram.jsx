// Mammogram.jsx
import { IconCalendarEvent } from "@tabler/icons-react";
import Reveal from "../motion/Reveal";
import { Button } from "../ui/Button";

const steps = [
  {
    step: "01",
    label: "Submit Mammogram",
    desc: "Extracts deep tissue features, density patterns, and micro-calcification signatures from input mammograms.",
  },
  {
    step: "02",
    label: "AI Risk Analysis",
    desc: "Generates a personalized 5-year risk score with explainable confidence intervals.",
  },
  {
    step: "03",
    label: "Clinical Interpretation",
    desc: "Delivers structured risk reports that integrate seamlessly into radiologist workflows.",
  },
];

const Mammogram = ({ onNavigate }) => {
  return (
    <section className="ot-section relative overflow-hidden bg-white" aria-labelledby="mammogram-heading">
      <div className="ot-container">
        {/* ── Section header ── */}
        <Reveal className="max-w-[46rem]">
          <h2 id="mammogram-heading" className="ot-h2">
            AI-Powered <span className="text-brand">Mammogram</span> Risk Analysis
          </h2>
          <p className="ot-lead mt-5 max-sm:mt-4">
            We combine clinical radiology expertise with advanced deep learning
            to analyze mammogram images and predict individualized breast cancer
            risk over the next 5 years — enabling earlier intervention and
            better patient outcomes.
          </p>
        </Reveal>

        {/* ── Image + how the prediction works ── */}
        <div className="mt-8 grid grid-cols-1 items-center gap-8 sm:mt-12 sm:gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-6">
            <div className="ot-media overflow-hidden rounded-xl border border-hairline shadow-soft" style={{ aspectRatio: "4/3" }}>
              <img
                src="/mammogram_1.webp"
                alt="AI mammogram risk analysis process"
                width={1747}
                height={975}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>

          <Reveal className="lg:col-span-6" delay={0.08}>
            <p className="ot-kicker">Predictive Intelligence</p>
            <h3 className="mt-3 text-[clamp(1.375rem,1.1rem+1.1vw,2rem)] font-[650] leading-[1.15] tracking-[-0.025em] text-ink">
              Predicting Cancer <span className="text-brand">Before It Occurs</span>
            </h3>

            {/* Steps as a numbered rail rather than three equal cards */}
            <ol className="mt-7 border-l border-hairline max-sm:mt-6">
              {steps.map((s) => (
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
              <Button variant="primary" onClick={() => onNavigate?.("mammo")}>
                <IconCalendarEvent size={18} stroke={1.75} aria-hidden="true" />
                Book Mammo AI Demo
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Mammogram;
