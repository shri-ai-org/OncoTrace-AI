import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

import HeroSection         from '../components/sections/HeroSection';
import Mammogram           from '../components/sections/Mammogram';
import LiquidBiopsySection from '../components/sections/LiquidBiopsySection';
import LungImagingSection  from '../components/sections/LungImagingSection';
import ProblemSection      from '../components/sections/ProblemSection';
import SolutionSection     from '../components/sections/SolutionSection';
import ContactSection      from '../components/layout/ContactSection';
import ClientOnly          from '../components/common/ClientOnly';
import ErrorBoundary       from '../components/common/ErrorBoundary';
import useInView           from '../hooks/useInView';
import { DNA3D_HEIGHT_CLASS, NAV_H, afterHomeLayout, whenHomeLayoutReady } from '../lib/layout';
import { wasHydrated } from '../lib/hydration';
import { scrollBehavior } from '../lib/scroll';

// Lazy so their heavy dependencies stay off the critical path.
//
// SampleReportSection renders the real Doctor Summary page, which pulls in
// recharts (~300KB). It sits right below the hero, so it starts downloading as
// soon as this page renders. Its height depends on content, so section scrolls
// wait for it via whenHomeLayoutReady() rather than guessing a placeholder size.
const SampleReportSection = lazy(() => import('../components/sections/SampleReportSection'));
// three.js + @react-three/fiber (~250KB gzip). Several screens down, so it is
// only fetched once the visitor scrolls near it (see NearViewport): on a slow
// mobile connection it no longer competes with the first screen's downloads.
const DNA3DSection = lazy(() => import('../components/sections/DNA3DSection'));

/* Renders a placeholder until it comes within `rootMargin` of the viewport,
   then `children`. Only for sections with a known, fixed height: the
   placeholder must be exactly as tall as the content, so nothing below moves
   and section scroll targets stay correct whether or not it has mounted.

   Observation starts only once the home layout has settled: before the sample
   report arrives, its short placeholder puts everything below it temporarily
   much closer to the top, which would trigger the load straight away. */
function NearViewport({ placeholderClassName, rootMargin = '1200px 0px', children }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    let live = true;
    whenHomeLayoutReady().then(() => { if (live) setArmed(true); });
    return () => { live = false; };
  }, []);

  if (!armed) return <div aria-hidden="true" className={placeholderClassName} />;
  return (
    <MountWhenNear className={placeholderClassName} rootMargin={rootMargin}>
      {children}
    </MountWhenNear>
  );
}

function MountWhenNear({ className, rootMargin, children }) {
  const [ref, near] = useInView({ threshold: 0, rootMargin });
  if (near) return children;
  return <div ref={ref} aria-hidden="true" className={className} />;
}

// Same surface color as the hero/workflow above, so the brief gap before the
// report chunk arrives reads as one continuous page.
const REPORT_PLACEHOLDER = <div aria-hidden="true" style={{ minHeight: '100vh', background: '#f8fafc' }} />;

/* Anchor wrapper: carries the id for scroll targeting only. The fixed-navbar
   offset is applied once, globally, via `scroll-padding-top` and the Navbar's
   own scroll offset; baking a second one in here would double-count it. */
function Section({ id, children, className = '' }) {
  return (
    <div id={id} className={`relative ${className}`}>
      {children}
    </div>
  );
}

/* Where the visitor was on each history entry of the homepage, so Back/Forward
   returns them there (React Router does not restore scroll). Keyed by the
   entry's location.key; in memory for this page session only, so a saved
   position also marks the entry as one the visitor is coming back to. */
const savedScroll = new Map();

// The browser's current history entry, keyed as React Router keys it (the
// session's first entry has no key in history.state: "default").
const currentEntryKey = () => window.history.state?.key ?? 'default';

/* If a lazily loaded section's chunk can't be fetched (flaky network, or a
   deploy replaced it), that section is left out instead of the whole page
   falling back to the crash screen. */
function LazySectionBoundary({ fallback = null, children }) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}

const REPORT_UNAVAILABLE = (
  <div className="ot-container py-16 text-center">
    <p className="ot-small">
      The sample report couldn&apos;t load.{' '}
      <button type="button" className="ot-link" onClick={() => window.location.reload()}>
        Reload the page
      </button>{' '}
      to try again.
    </p>
  </div>
);

export default function HomePage({ onNavigate }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const didMount = useRef(false);

  // Remember this entry's scroll position (see savedScroll), but only while it
  // is the browser's current entry. Leaving changes the URL before React
  // unmounts this page (much later while the next page's code downloads), and
  // the navigation's own scroll-to-top must not overwrite the real position.
  useLayoutEffect(() => {
    const key = location.key;
    const onScroll = () => {
      if (currentEntryKey() === key) savedScroll.set(key, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key]);

  // Deep links: /?section=team or /#team
  useEffect(() => {
    const params  = new URLSearchParams(location.search);
    const section = params.get('section') || location.hash?.replace('#', '');

    // Back/Forward to a homepage entry already visited in this session: put
    // the visitor back where they were, rather than jumping to ?section=
    // again. Decided by the saved position, not by when the page unmounted: a
    // quick Back while the next page's code was still loading used to read as
    // a first visit. (A first visit is also a POP, with nothing saved yet.)
    const y = navigationType === 'POP' ? savedScroll.get(location.key) : undefined;
    if (y != null) {
      didMount.current = true;
      return afterHomeLayout(() => window.scrollTo({ top: y, behavior: 'instant' }));
    }

    // On first mount with no target, make sure we start at the top -- except
    // when hydrating the prerendered page: the visitor may already have
    // scrolled the server HTML, and yanking them back would be hostile.
    if (!section || section === 'home') {
      if (!didMount.current && !wasHydrated()) window.scrollTo({ top: 0, behavior: 'auto' });
      didMount.current = true;
      return;
    }
    didMount.current = true;

    return afterHomeLayout(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });
    // Runs only when the target changes: the navigation type and key are read
    // as of that change on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.hash]);

  return (
    <main
      className="min-h-screen bg-white"
      // push content below the fixed navbar
      style={{ paddingTop: NAV_H }}
    >
      <div id="home">
        <HeroSection />
      </div>

      {/* The sample report (protected: its files are never edited). It owns
          the id="sample-report" anchor itself. ClientOnly keeps it out of the
          prerendered HTML and out of hydration (React would otherwise discard
          that server boundary with error #419); the boundary class restores
          the exact font stack it always inherited from <body>. */}
      <div className="ot-report-boundary relative">
        <ClientOnly fallback={REPORT_PLACEHOLDER}>
          <LazySectionBoundary fallback={REPORT_UNAVAILABLE}>
            <Suspense fallback={REPORT_PLACEHOLDER}>
              <SampleReportSection />
            </Suspense>
          </LazySectionBoundary>
        </ClientOnly>
      </div>

      {/* Breathing room */}
      <div aria-hidden="true" className="h-12 bg-white sm:h-16 lg:h-20" />

      <NearViewport placeholderClassName={DNA3D_HEIGHT_CLASS}>
        <LazySectionBoundary>
          <Suspense fallback={<div aria-hidden="true" className={DNA3D_HEIGHT_CLASS} />}>
            <DNA3DSection />
          </Suspense>
        </LazySectionBoundary>
      </NearViewport>

      <Section id="mammogram">
        <Mammogram onNavigate={onNavigate} />
      </Section>

      <Section id="liquid-biopsy">
        <LiquidBiopsySection />
      </Section>

      <Section id="lung-imaging">
        <LungImagingSection />
      </Section>

      <ProblemSection />

      <Section id="solution">
        <SolutionSection />
      </Section>

      <ContactSection />
    </main>
  );
}
