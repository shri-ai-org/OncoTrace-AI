import { IconArrowRight, IconFlask2 } from "@tabler/icons-react";
import Reveal from "../motion/Reveal";
import { Button } from "../ui/Button";
import { scrollToSection } from "../../lib/scroll";

const FEATURES = ["Non-invasive", "Real-time insights", "AI-powered", "ctDNA analysis"];

const ICON = { size: 20, stroke: 1.75, "aria-hidden": true };

export default function LiquidBiopsyMonitoring() {
  return (
    <div className="bg-canvas text-ink">
      {/* ── A. Introduction ── */}
      <section className="ot-section pb-10 sm:pb-16" aria-labelledby="lb-heading">
        <div className="ot-container grid grid-cols-1 items-center gap-10 max-sm:gap-8 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-6">
            <h2 id="lb-heading" className="ot-h2">
              Real-time monitoring using
              <br />
              <span className="text-brand">Liquid Biopsy.</span>
            </h2>
            <p className="ot-lead mt-5 max-sm:mt-4">
              Non-invasive liquid biopsy combined with AI for continuous
              cancer progression tracking and treatment response monitoring.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 max-sm:mt-6">
              <Button variant="primary" onClick={() => scrollToSection("lb-technology")}>
                Explore technology
                <IconArrowRight size={17} stroke={1.75} aria-hidden="true" />
              </Button>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-6" delay={0.08}>
            <div className="ot-media overflow-hidden rounded-xl" style={{ aspectRatio: "16/10" }}>
              <img
                src="/lb-hero.webp"
                alt="Liquid biopsy visualization"
                width={708}
                height={507}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── B. Technology ── */}
      <section id="lb-technology" className="pb-12 pt-6 max-sm:pt-4 sm:pb-20 lg:pb-24" aria-labelledby="lb-tech-heading">
        <div className="ot-container">
          <div className="ot-card grid grid-cols-1 items-center gap-8 p-5 max-sm:gap-6 max-sm:p-4 sm:p-8 lg:grid-cols-12 lg:gap-12 lg:p-10">
            <Reveal className="lg:col-span-5">
              <div className="ot-media overflow-hidden rounded-lg" style={{ aspectRatio: "16/11" }}>
                <img
                  src="/ngs.webp"
                  alt="Next Generation Sequencing machine"
                  width={707}
                  height={678}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover"
                />
              </div>
            </Reveal>

            <Reveal className="lg:col-span-7" delay={0.08}>
              <h2 id="lb-tech-heading" className="text-[clamp(1.5rem,1.2rem+1.3vw,2.25rem)] font-[650] leading-[1.12] tracking-[-0.03em] text-ink">
                Next-generation sequencing at the core.
              </h2>
              <p className="ot-body mt-4">
                Ultra-sensitive genomic profiling from circulating tumor DNA
                (ctDNA) without invasive tissue sampling. AI-driven analysis
                delivers real-time insights.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Key features">
                {FEATURES.map((feature) => (
                  <li key={feature} className="ot-chip">{feature}</li>
                ))}
              </ul>
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200/70 bg-amber-50/70 px-4 py-3">
                <IconFlask2 size={18} stroke={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-sm leading-relaxed text-amber-900">
                  Currently in R&D, refining accuracy, scalability, and
                  clinical integration for cancer-positive patients.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
