import {
  IconActivity, IconChartBar, IconHeartHandshake, IconMicroscope, IconShieldCheck, IconStethoscope,
} from "@tabler/icons-react";
import Reveal from "../motion/Reveal";

const ICON = { size: 20, stroke: 1.75, "aria-hidden": true };

/* Small status label. Tones map to the card surface it sits on. */
function Pill({ children, tone = "light", className = "" }) {
  const tones = {
    light: "border-hairline bg-white text-body",
    brand: "border-brand-line bg-brand-soft text-brand",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    onDark: "border-white/15 bg-white/[0.06] text-slate-200",
    onDarkGreen: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    onDarkAmber: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

function IconTile({ children, dark = false, className = "" }) {
  return (
    <span className={`${className} flex h-10 w-10 items-center justify-center rounded-lg ${dark ? "bg-white/[0.08] text-white" : "bg-brand-soft text-brand"}`}>
      {children}
    </span>
  );
}

/* ═══ Bento: four cells, four messages ═══
   The mammogram and liquid biopsy sections right above already cover risk
   prediction and liquid biopsy, so the bento only adds what they don't.
   lg: [A 8 | E 4] [F 6 | G 6]
   md: [A 6] [E 3 | F 3] [G 6]
   sm: single column. */
function Bento() {
  const card = "relative h-full overflow-hidden rounded-xl p-5 sm:p-7";
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-6 lg:grid-cols-12 lg:gap-4">
      {/* A */}
      <Reveal className="md:col-span-6 lg:col-span-8">
        <div className={`${card} ot-card flex flex-col justify-between bg-white lg:p-10`}>
          <div>
            <Pill tone="brand" className="max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
              <span>
                <span className="whitespace-nowrap">OncoTrace-AI · Open-Source ·</span>{" "}
                <span className="whitespace-nowrap">Not-for-Profit</span>
              </span>
            </Pill>
            <h2 className="ot-display mt-6 max-w-[16ch] max-sm:mt-5">
              Real-Time Precision
              <br />
              <span className="text-brand">Monitoring</span> in Oncology
            </h2>
            <p className="ot-body mt-4 max-w-[56ch]">
              AI-driven cancer intelligence across the entire disease lifecycle —
              from early risk prediction using imaging data to continuous
              progression monitoring powered by liquid biopsy.
            </p>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 max-sm:mt-6">
            {["Early Risk Detection", "24 / 7 Monitoring", "Open Source", "Non-Invasive"].map((t) => (
              <li key={t} className="ot-chip">{t}</li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* E */}
      <Reveal className="md:col-span-3 lg:col-span-4" delay={0.06}>
        <div className={`${card} flex flex-col justify-between bg-brand text-blue-50`}>
          <div className="flex items-start justify-between">
            <IconTile dark><IconActivity {...ICON} /></IconTile>
            <Pill tone="onDark">ACTIVE</Pill>
          </div>
          <div className="mt-10 max-sm:mt-6">
            <h3 className="text-[1.125rem] font-semibold tracking-[-0.015em] text-white">Real-Time Monitoring</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-blue-100">
              Continuous tracking across the entire disease lifecycle with actionable insights as cancer evolves.
            </p>
            <p className="mt-4 flex items-center gap-2 text-[0.8125rem] font-medium text-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
              All systems operational
            </p>
          </div>
        </div>
      </Reveal>

      {/* F */}
      <Reveal className="md:col-span-3 lg:col-span-6" delay={0.04}>
        <div className={`${card} ot-night flex flex-col justify-between`}>
          <div className="flex items-start justify-between">
            <IconTile dark><IconShieldCheck {...ICON} /></IconTile>
            <Pill tone="onDarkGreen">Compliant</Pill>
          </div>
          <div className="mt-10 max-sm:mt-6">
            <h3 className="text-[1.125rem] font-semibold tracking-[-0.015em] text-white">Privacy &amp; Compliance</h3>
            <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-slate-300">
              End-to-end de-identification, audit trails, and privacy-first data pipelines by design.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {["HIPAA", "GDPR", "ISO 27001", "SOC 2"].map((b) => (
                <li key={b} className="ot-tech rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-200">{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* G */}
      <Reveal className="md:col-span-6 lg:col-span-6" delay={0.08}>
        <div className={`${card} flex flex-col justify-between border border-brand-line bg-brand-soft`}>
          <p className="ot-kicker">Our Mission</p>
          <blockquote className="mt-6 max-sm:mt-4 text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] font-semibold leading-[1.45] tracking-[-0.015em] text-ink">
            Making precision oncology intelligence accessible, transparent,
            and globally collaborative — from first risk signal to real-time
            progression tracking.
          </blockquote>
          <div className="mt-8 flex items-center gap-3 max-sm:mt-6">
            <span className="h-px flex-1 bg-brand-line" aria-hidden="true" />
            <span className="ot-tech uppercase tracking-[0.12em] text-brand">OncoTrace-AI</span>
            <span className="h-px flex-1 bg-brand-line" aria-hidden="true" />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ═══ Audience: 2 x 2 ═══ */
const AUDIENCES = [
  { role: "Clinicians", Icon: IconStethoscope, desc: "Predictive risk insights and real-time monitoring data for faster, more informed decisions." },
  { role: "Patients", Icon: IconHeartHandshake, desc: "Clarity through early risk signals and transparent, continuous precision monitoring." },
  { role: "Researchers", Icon: IconMicroscope, desc: "Open-source oncology tools to build, test, and collaborate across prediction and monitoring." },
  { role: "Pharma", Icon: IconChartBar, desc: "Longitudinal monitoring and continuous data across the full disease and treatment lifecycle." },
];

function AudienceSection() {
  return (
    <section className="border-t border-hairline bg-white py-12 sm:py-20 lg:py-24" aria-labelledby="audience-heading">
      <div className="ot-container grid grid-cols-1 gap-10 max-sm:gap-6 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-4">
          <p className="ot-kicker">Who It&apos;s For</p>
          <h2 id="audience-heading" className="ot-h2 mt-4">Built for the entire oncology ecosystem</h2>
        </Reveal>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 lg:col-span-8">
          {AUDIENCES.map(({ role, Icon, desc }, i) => (
            <Reveal as="li" key={role} delay={i * 0.06} className="bg-white p-7 max-sm:grid max-sm:grid-cols-[auto_1fr] max-sm:gap-x-4 max-sm:px-5 max-sm:py-5 sm:p-8">
              <IconTile className="max-sm:row-span-2"><Icon {...ICON} /></IconTile>
              <h3 className="mt-5 text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink max-sm:mt-0 max-sm:text-[1rem]">{role}</h3>
              <p className="ot-small mt-2 max-sm:col-start-2 max-sm:mt-1">{desc}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function SolutionSection() {
  return (
    <div className="bg-canvas text-ink">
      <section className="ot-section" aria-label="The OncoTrace-AI platform">
        <div className="ot-container">
          <Bento />
        </div>
      </section>
      <AudienceSection />
    </div>
  );
}
