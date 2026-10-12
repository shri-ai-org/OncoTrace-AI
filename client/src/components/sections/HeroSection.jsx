import { Fragment } from 'react'
import { IconLungs, IconScan, IconTestPipe2 } from '@tabler/icons-react'
import Reveal from '../motion/Reveal'
import Hero from '../ui/Hero'
import BloodDropParticles from '../motion/BloodDropParticles'
import ErrorBoundary from '../common/ErrorBoundary'
import { scrollToSection } from '../../lib/scroll'
import './HeroSection.css'

// Descriptions kept close in length (roughly 55-70 characters) on purpose:
// each card reserves the same vertical space for this text (see the
// minHeight notes in FlowCard), and outliers that need an extra line broke
// the "every card the same size" requirement.
const WORKFLOW_STEPS = [
  {
    id: 1, label: 'Blood Draw', icon: '/img1.webp', width: 1433, height: 800,
    description: 'A routine blood sample is collected from the patient.',
  },
  {
    id: 2, label: 'Plasma Separation', icon: '/img2.webp', width: 1404, height: 800,
    description: 'Plasma is isolated to access circulating tumor DNA.',
  },
  {
    id: 3, label: 'ctDNA + NGS', icon: '/img3.webp', width: 1192, height: 800,
    description: 'ctDNA is extracted and sequenced for a full genomic profile.',
  },
  {
    id: 4, label: 'AI Analysis', icon: '/img4.webp', width: 1433, height: 800,
    description: 'AI models identify and tier clinically relevant variants.',
  },
  {
    // report-preview.webp is a tight crop of the live report's risk-score
    // gauge, so it already frames "the AI report" without extra zoom.
    // `contain` on white: identical to `cover` in the square tablet/desktop
    // frames, and keeps the whole gauge in the phone's landscape frame.
    id: 5, label: 'AI Report', icon: '/report-preview.webp', width: 900, height: 900, fit: 'contain',
    description: 'Findings are compiled into a structured, evidence-linked report.',
  },
]

/* ═══════════════════════════════════════════════════════
   FLOW CARD: photo on top, text panel below
   ═══════════════════════════════════════════════════════ */

/* `compact` (phone stack only): landscape 16:10 photos (the photos' native
   shape) and a tighter text panel. All phone cards share one width, aspect
   and min-heights, so they stay identical in size. */
function FlowCard({ step, compact = false }) {
  const number = String(step.id).padStart(2, '0')
  return (
    <div className="flow-card ot-card flex h-full w-full flex-col overflow-hidden">
      {/* Rendered visible over a neutral placeholder (no onLoad gating): on
          the prerendered page an image can finish loading before React
          attaches, and its load event would never fire. */}
      <div className={`ot-media relative w-full overflow-hidden ${compact ? 'aspect-[16/10]' : 'aspect-square'} ${step.fit === 'contain' ? 'bg-white' : ''}`}>
        <img
          src={step.icon}
          alt={step.label}
          width={step.width}
          height={step.height}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`absolute inset-0 h-full w-full ${step.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        />
      </div>

      <div className={`flex flex-1 flex-col border-t border-hairline ${compact ? 'px-4 pb-3.5 pt-3' : 'px-3.5 pb-4 pt-3 sm:px-4'}`}>
        <p className="ot-tech text-brand">{number}</p>
        {/* min-heights in `em` (relative to each element's own responsive
            font size) reserve two label lines and three description lines,
            so every card renders at the same height whatever its text. */}
        <p
          className="mt-1.5 font-semibold tracking-[-0.01em] text-ink"
          style={compact
            ? { fontSize: '0.9375rem', lineHeight: 1.3, minHeight: '1.3em' }
            : { fontSize: 'clamp(0.875rem, 0.8rem + 0.25vw, 0.9688rem)', lineHeight: 1.3, minHeight: '2.6em' }}
        >
          {step.label}
        </p>
        <p
          className="mt-1 text-muted"
          style={compact
            ? { fontSize: '0.8125rem', lineHeight: 1.5, minHeight: '3em' }
            : { fontSize: 'clamp(0.75rem, 0.71rem + 0.18vw, 0.8438rem)', lineHeight: 1.55, minHeight: '4.65em' }}
        >
          {step.description}
        </p>
      </div>
    </div>
  )
}

// Shared with the tablet row-2 width formula, so a card in the 2-card row is
// algebraically the same width as a card in the 3-card row.
const CONNECTOR_WIDTH_CSS = 'clamp(22px, 2.4vw, 44px)'
const CARD_GAP_CSS = '0.5rem' // matches the `gap-2` utility used around these cards

function Connector() {
  return (
    <div className="flex flex-shrink-0 items-center self-center" style={{ width: CONNECTOR_WIDTH_CSS }} aria-hidden="true">
      <div className="flow-connector" />
    </div>
  )
}

function VConnector({ compact = false }) {
  return (
    <div className={compact ? 'h-7 py-1' : 'h-10 py-1.5'} aria-hidden="true">
      <div className="flow-connector-v" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */

// The three capabilities, as linked cards under the subtitle (in place of a
// CTA button). Same icons as their navbar links.
const CAPABILITIES = [
  { label: 'Mammogram Analysis', caption: 'AI · Breast imaging', Icon: IconScan, href: '#mammogram', onSelect: () => scrollToSection('mammogram') },
  { label: 'Liquid Biopsy Analysis', caption: 'AI · Blood ctDNA', Icon: IconTestPipe2, href: '#liquid-biopsy', onSelect: () => scrollToSection('liquid-biopsy') },
  { label: 'Lung Cancer Analysis', caption: 'AI · CT imaging', Icon: IconLungs, href: '#lung-imaging', onSelect: () => scrollToSection('lung-imaging') },
]

// Reused from the platform card further down the page.
const HERO_SUBTITLE =
  'AI-driven cancer intelligence across the entire disease lifecycle — from early risk prediction using imaging data to continuous progression monitoring powered by liquid biopsy.'

function HeroIntro() {
  return (
    <Hero
      ariaLabel="Hero - AI-powered precision oncology platform"
      hold
      eyebrow={
        <div className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:text-[11px]">
            Open Source · Not For Profit
          </span>
          <span className="hidden h-3 w-px bg-hairline-strong sm:block" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand sm:text-[11px]">
            AI For Health · Care For All
          </span>
        </div>
      }
      title={
        <>
          Real-time Precision{' '}
          {/* Desktop: a fixed two-line break, so the copy block shrink-wraps
              to the headline's longer line. */}
          <br className="hidden lg:block" />
          <span className="sm:whitespace-nowrap">
            Monitoring of <span className="text-brand">Oncology</span>
          </span>
        </>
      }
      tagline={
        <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand sm:text-[12px] lg:justify-start">
          <span className="h-4 w-[2px] shrink-0 rounded-full bg-brand" aria-hidden="true" />
          AI — Powered
        </p>
      }
      subtitle={HERO_SUBTITLE}
      capabilities={CAPABILITIES}
      visual={
        // Decorative; if it ever fails, the hero simply renders without it.
        <ErrorBoundary fallback={null}>
          <BloodDropParticles />
        </ErrorBoundary>
      }
      footnote={
        <p>
          Powered by{' '}
          <a
            href="https://shri-ai.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-2 underline decoration-hairline-strong underline-offset-[3px] transition-colors hover:text-brand hover:decoration-brand"
          >
            Senus Healthcare Research Institute
          </a>
          , USA
        </p>
      }
    />
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════ */

export default function HeroSection() {
  return (
    <div className="w-full bg-canvas">
      <a
        href="#workflow-section"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10002] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand focus:shadow-lg"
      >
        Skip to workflow
      </a>

      <HeroIntro />

      {/* ── Workflow ── */}
      <section id="workflow-section" className="relative w-full bg-canvas" aria-label="From Sample to Clinical Insight">
        <div className="mx-auto max-w-[1600px] px-3 pb-8 pt-10 max-sm:px-4 max-sm:pb-6 max-sm:pt-9 sm:px-4 sm:pb-10 sm:pt-12 lg:px-6 lg:pb-12 lg:pt-16">
          <Reveal className="mb-7 text-center max-sm:mb-6 sm:mb-9 lg:mb-11">
            <h2 className="ot-h2">
              From Sample to <span className="text-brand">Clinical Insight</span>
            </h2>
            <p className="ot-lead mx-auto mt-3">Five stages, one continuous liquid biopsy workflow.</p>
          </Reveal>

          {/* Desktop (lg+): five equal cards in one row. Connectors are
              siblings of the card wrappers (not nested), so all five flex-1
              wrappers share the row width exactly evenly. */}
          <div className="hidden lg:flex lg:items-stretch lg:justify-center lg:gap-1.5 xl:gap-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <Fragment key={step.id}>
                <Reveal className="flex min-w-0 flex-1" delay={index * 0.07}>
                  <FlowCard step={step} />
                </Reveal>
                {index < WORKFLOW_STEPS.length - 1 && <Connector />}
              </Fragment>
            ))}
          </div>

          {/* Tablet (md to lg): 3 on top, 2 below. Row 1 = 3 cards + 2
              connectors + 4 gaps; row 2 = 2 such cards + 1 connector + 2 gaps,
              so its width is solved from row 1's card width exactly. */}
          <div className="hidden md:block lg:hidden">
            <div className="flex items-stretch gap-2">
              {WORKFLOW_STEPS.slice(0, 3).map((step, index) => (
                <Fragment key={step.id}>
                  <Reveal className="flex min-w-0 flex-1" delay={index * 0.07}>
                    <FlowCard step={step} />
                  </Reveal>
                  {index < 2 && <Connector />}
                </Fragment>
              ))}
            </div>
            <VConnector />
            <div
              className="mx-auto flex items-stretch gap-2"
              style={{
                width: `calc(2 * ((100% - 4 * ${CARD_GAP_CSS} - 2 * ${CONNECTOR_WIDTH_CSS}) / 3) + ${CONNECTOR_WIDTH_CSS} + 2 * ${CARD_GAP_CSS})`,
              }}
            >
              {WORKFLOW_STEPS.slice(3).map((step, index) => (
                <Fragment key={step.id}>
                  <Reveal className="flex min-w-0 flex-1" delay={index * 0.07}>
                    <FlowCard step={step} />
                  </Reveal>
                  {index === 0 && <Connector />}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Mobile (< md): vertical stack */}
          <div className="flex flex-col items-center md:hidden">
            {WORKFLOW_STEPS.map((step, index) => (
              <Fragment key={step.id}>
                <Reveal className="w-full max-w-sm">
                  <FlowCard step={step} compact />
                </Reveal>
                {index < WORKFLOW_STEPS.length - 1 && <VConnector compact />}
              </Fragment>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 max-sm:mt-6 lg:mt-10">
            {/* Fixed-size wrapper: .flow-connector itself is width:100% */}
            <span className="inline-flex w-6 items-center" aria-hidden="true">
              <span className="flow-connector" />
            </span>
            <span className="ml-1 text-xs font-medium text-muted">Process flow, left to right</span>
          </div>
        </div>
      </section>
    </div>
  )
}
