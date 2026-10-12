// Navbar.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, m, useIsPresent, useMotionValueEvent, useScroll } from 'motion/react';
import {
  IconArrowLeft, IconArrowRight, IconArrowUpRight, IconCalendarEvent, IconChevronDown,
  IconDroplet, IconHome2, IconLungs, IconMail, IconNews, IconPlayerPlay, IconScan, IconSparkles,
  IconTestPipe2, IconUsersGroup,
} from '@tabler/icons-react';
import useFocusTrap from '../../hooks/useFocusTrap';
import { navOffset as getScrollOffset, scrollToSection as smoothScrollToId } from '../../lib/scroll';
import { TEAM_URL } from '../../lib/site';

// ─── Constants ────────────────────────────────────────────────────────────────


const NAV_LINKS = [
  { label: 'Home', href: '#home', Icon: IconHome2 },
  { label: 'AI Mammogram Analysis', href: '#mammogram', Icon: IconScan },
  { label: 'AI Blood-Based Cancer Test', href: '#liquid-biopsy', Icon: IconTestPipe2 },
  { label: 'AI Lung Cancer Imaging', href: '#lung-imaging', Icon: IconLungs },
  // The team lives on the institute's site; opens in a new tab like the
  // site's other external links.
  { label: 'Team', external: TEAM_URL, Icon: IconUsersGroup },
  { label: 'Blog', href: '#blog-page', Icon: IconNews },
  { label: 'Contact', href: '#cta', Icon: IconMail },
];

// Section links whose targets exist on the home page (for active tracking).
const TRACKED = NAV_LINKS.filter((l) => l.href && l.href !== '#home' && l.href !== '#blog-page');

const PRODUCT_LINKS = [
  { label: 'Liquid Biopsy', action: 'view-lb', Icon: IconDroplet },
  { label: 'Mammogram', action: 'view-mammo', Icon: IconSparkles },
];

const BOOKING_LINKS = [
  { label: 'Book Liquid Biopsy Demo', subtitle: 'Schedule a walkthrough with our team', action: 'book-lb', Icon: IconCalendarEvent },
  { label: 'Book Mammo AI Demo', subtitle: 'Schedule a walkthrough with our team', action: 'book-mammo', Icon: IconCalendarEvent },
];

const ICON = { size: 18, stroke: 1.75, 'aria-hidden': true };

// Navbar icons are stroked with a subtle brand gradient (deep cobalt into a
// lighter blue), defined once in <NavIconGradient/> and referenced by id.
const GRADIENT_ICON = { stroke: 1.6, color: 'url(#nb-icon-gradient)', 'aria-hidden': true };

function NavIconGradient() {
  // Zero-size, not display:none: some browsers won't resolve url(#id)
  // references into an element that isn't rendered.
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="pointer-events-none absolute">
      <defs>
        <linearGradient id="nb-icon-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// The desktop bar shows from 1280px (`xl`); below that the menu button and
// drawer take over. With seven links, the labels alone fit from 1280px and the
// link/CTA icons (~140px more) from 1440px (`min-[1440px]:block`, written out
// literally so Tailwind generates it). Measured, not guessed: keep these in
// step if a link is added or renamed.
const EASE = [0.16, 1, 0.3, 1];

// ─── Desktop dropdown ─────────────────────────────────────────────────────────

function DesktopDropdown({ links, ariaLabel, panelId, onAction, onClose, triggerRef, focusFirst }) {
  const panelRef = useRef(null);
  // While the exit animation plays the panel is inert, so Tab moving on from
  // the last item can't land inside something that is disappearing.
  const isPresent = useIsPresent();

  // Close on outside press (armed after a beat so the opening click doesn't count).
  useEffect(() => {
    let timer = setTimeout(() => {
      timer = null;
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 80);
    function onPointerDown(e) {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      onClose();
    }
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onClose, triggerRef]);

  // Keyboard-opened menus move focus to the first item (WAI-ARIA menu button).
  useEffect(() => {
    if (focusFirst) panelRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [focusFirst]);

  const onKeyDown = (e) => {
    const items = [...panelRef.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Tab') {
      // Close and hand focus back to the trigger (Tab would otherwise move to
      // the next item of a panel that is about to disappear).
      e.preventDefault();
      onClose();
      triggerRef.current?.focus();
    }
  };

  return (
    <m.div
      ref={panelRef}
      id={panelId}
      role="menu"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      inert={!isPresent || undefined}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE }}
      style={{ transformOrigin: 'top right' }}
      className="absolute right-0 top-[calc(100%+10px)] z-[10001] min-w-[300px] rounded-2xl border border-hairline bg-white p-1.5 shadow-lift"
    >
      {links.map((p) => (
        <button
          key={p.action}
          type="button"
          role="menuitem"
          onClick={() => onAction(p.action)}
          className="group flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left outline-none transition-colors hover:bg-canvas focus-visible:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
        >
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <p.Icon {...ICON} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.9375rem] font-semibold leading-snug text-ink">{p.label}</span>
            {p.subtitle && <span className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{p.subtitle}</span>}
          </span>
        </button>
      ))}
    </m.div>
  );
}

// ─── Body scroll lock ─────────────────────────────────────────────────────────

function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prevOver = document.body.style.overflow;
    const prevPR = document.body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      document.body.style.overflow = prevOver;
      document.body.style.paddingRight = prevPR;
    };
  }, [active]);
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

const drawerList = { animate: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } } };
const drawerItem = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

/* Desktop nav icon: gradient-stroked, lifts a touch on hover. */
function NavIcon({ Icon }) {
  return (
    <Icon
      size={16}
      {...GRADIENT_ICON}
      className="hidden shrink-0 transition-transform duration-300 group-hover:-translate-y-px min-[1440px]:block"
    />
  );
}

/* Mobile menu icon tile: a soft white-to-brand chip with a hairline edge;
   solid brand when the row is the current section. */
function IconTile({ Icon, active = false }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition-colors ${
        active
          ? 'border-brand bg-brand text-white shadow-[0_4px_12px_-4px_rgb(29_78_216/0.55)]'
          : 'border-hairline bg-gradient-to-br from-white to-brand-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.9)]'
      }`}
      aria-hidden="true"
    >
      {active ? <Icon size={18} stroke={1.75} aria-hidden="true" /> : <Icon size={18} {...GRADIENT_ICON} />}
    </span>
  );
}

function DrawerRow({ children }) {
  return <m.div variants={drawerItem}>{children}</m.div>;
}

function MobileDrawer({ onClose, isSecondaryPage, pageLabel, activeHref, onNavClick, onProduct, onHome }) {
  const ref = useRef(null);
  const isPresent = useIsPresent();
  // Trap focus only while fully present; during the exit animation the panel
  // is inert so focus can't land in something that is disappearing.
  useFocusTrap(ref, isPresent, onClose);

  const rowBase = 'flex w-full items-center gap-3 rounded-xl px-3.5 min-h-[52px] text-left text-[0.9375rem] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset';

  return (
    <m.div
      ref={ref}
      id="nb-mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      tabIndex={-1}
      inert={!isPresent || undefined}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
      transition={{ duration: 0.3, ease: EASE }}
      className="nb-drawer-scroll fixed inset-x-0 top-[var(--nav-h)] z-[9998] max-h-[calc(100dvh-var(--nav-h))] overflow-y-auto border-t border-hairline bg-white px-3 pb-[max(env(safe-area-inset-bottom,0px),16px)] pt-2 shadow-lift"
    >
      <m.div variants={drawerList} initial="initial" animate="animate">
        {isSecondaryPage ? (
          <>
            <DrawerRow>
              <p className="px-3.5 pb-3 pt-2 text-[0.875rem] leading-relaxed text-muted">
                {pageLabel === 'Blog'
                  ? "You're currently viewing the OncoTrace-AI research blog."
                  : pageLabel === 'Page not found'
                    ? "This page doesn't exist. Head back to the homepage to explore OncoTrace-AI."
                    : pageLabel === 'LB Booking' || pageLabel === 'Mammo Booking'
                      ? "You're booking a demo with the OncoTrace-AI team."
                      : "You're currently viewing the OncoTrace-AI platform demo."}
              </p>
            </DrawerRow>
            <DrawerRow>
              <button type="button" onClick={onHome} className="ot-btn ot-btn-secondary w-full">
                <IconArrowLeft {...ICON} />
                Back to Home
              </button>
            </DrawerRow>
          </>
        ) : (
          <>
            <DrawerRow>
              <span className="ot-kicker px-3.5 pb-1 pt-2">Navigate</span>
            </DrawerRow>
            {NAV_LINKS.map(({ label, href, external, Icon }) => (
              <DrawerRow key={label}>
                {external ? (
                  <a href={external} target="_blank" rel="noopener noreferrer" onClick={onClose} className={`${rowBase} text-ink hover:bg-canvas`}>
                    <IconTile Icon={Icon} />
                    <span className="flex-1">{label}</span>
                    <IconArrowUpRight size={16} stroke={1.75} aria-hidden="true" className="text-muted" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavClick(href)}
                    aria-current={activeHref === href ? 'page' : undefined}
                    className={`${rowBase} ${activeHref === href ? 'bg-brand-soft font-semibold text-brand' : 'text-ink hover:bg-canvas'}`}
                  >
                    <IconTile Icon={Icon} active={activeHref === href} />
                    <span className="flex-1">{label}</span>
                    <IconArrowRight size={16} stroke={1.75} aria-hidden="true" className="text-hairline-strong" />
                  </button>
                )}
              </DrawerRow>
            ))}

            {[['Book a Demo', BOOKING_LINKS], ['View Demo', PRODUCT_LINKS]].map(([heading, links]) => (
              <DrawerRow key={heading}>
                <div className="mt-2 border-t border-hairline pt-3">
                  <span className="ot-kicker px-3.5 pb-1.5 text-muted">{heading}</span>
                  {links.map((p) => (
                    <button
                      key={p.action}
                      type="button"
                      onClick={() => onProduct(p.action)}
                      className="flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left outline-none transition-colors hover:bg-canvas focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
                    >
                      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <p.Icon {...ICON} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[0.9375rem] font-semibold leading-snug text-ink">{p.label}</span>
                        {p.subtitle && <span className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{p.subtitle}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </DrawerRow>
            ))}
          </>
        )}
      </m.div>
    </m.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Navbar({ currentPage = 'home', onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDd, setOpenDd] = useState(null); // 'book' | 'view' | null
  const [ddByKeyboard, setDdByKeyboard] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState('#home');
  const [logoError, setLogoError] = useState(false);
  const [prevPage, setPrevPage] = useState(currentPage);

  const bookTriggerRef = useRef(null);
  const viewTriggerRef = useRef(null);
  const hamburgerRef = useRef(null);
  const pendingRef = useRef(null); // action to run once the drawer has closed

  const isSecondaryPage = currentPage !== 'home';
  const isBlogPage = currentPage === 'blog';

  // Reset menu/dropdown UI on navigation (React's "adjust state when a prop
  // changes" pattern, applied during render).
  if (currentPage !== prevPage) {
    setPrevPage(currentPage);
    setMenuOpen(false);
    setOpenDd(null);
  }

  useBodyScrollLock(menuOpen);

  // The drawer belongs to narrow screens: if the window is widened past the
  // desktop breakpoint while it is open, close it (no focus move; the
  // hamburger it would return to is now hidden).
  useEffect(() => {
    if (!menuOpen) return undefined;
    const desktop = window.matchMedia('(min-width: 1280px)');
    const onChange = (e) => { if (e.matches) setMenuOpen(false); };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, [menuOpen]);

  const navigate = useCallback((page) => {
    if (typeof onNavigate === 'function') onNavigate(page);
  }, [onNavigate]);

  // Closing returns focus to the hamburger (the dialog's opener).
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => hamburgerRef.current?.focus());
  }, []);

  // Run a navigation either right away (drawer closed) or once the drawer's
  // exit animation has finished and the body scroll lock is released.
  const runAfterMenu = useCallback((fn) => {
    if (menuOpen) {
      pendingRef.current = fn;
      closeMenu();
    } else {
      fn();
    }
  }, [menuOpen, closeMenu]);

  const onDrawerExitComplete = useCallback(() => {
    const fn = pendingRef.current;
    pendingRef.current = null;
    fn?.();
  }, []);

  // Scroll state without re-rendering per frame: Motion's scroll value feeds
  // the progress bar directly; React state only flips at thresholds.
  const { scrollY, scrollYProgress } = useScroll();
  const syncActive = useCallback(() => {
    if (currentPage !== 'home') return;
    let cur = '#home';
    const offset = getScrollOffset() + 20;
    for (let i = TRACKED.length - 1; i >= 0; i--) {
      const el = document.getElementById(TRACKED[i].href.slice(1));
      if (el && el.getBoundingClientRect().top <= offset) { cur = TRACKED[i].href; break; }
    }
    setActiveHref(cur);
  }, [currentPage]);
  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 8);
    syncActive();
  });
  // Also on arrival (e.g. back from the blog at the top of the page, where no
  // scroll event fires): otherwise the last section clicked stays underlined.
  useEffect(() => {
    const raf = requestAnimationFrame(syncActive);
    return () => cancelAnimationFrame(raf);
  }, [syncActive]);
  const effectiveActive = isBlogPage ? '#blog-page' : activeHref;

  useEffect(() => {
    if (!openDd) return;
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      const trigger = openDd === 'book' ? bookTriggerRef.current : viewTriggerRef.current;
      setOpenDd(null);
      trigger?.focus();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openDd]);

  // Coming back to home from another page with a pending section target.
  useEffect(() => {
    if (currentPage !== 'home') return;
    let target;
    try {
      target = sessionStorage.getItem('nb-scroll-target');
      if (target) sessionStorage.removeItem('nb-scroll-target');
    } catch {
      return; // storage access blocked (e.g. private browsing): nothing to recover
    }
    if (!target) return;
    requestAnimationFrame(() => setTimeout(() => smoothScrollToId(target), 120));
  }, [currentPage]);

  const handleNavClick = useCallback((href) => {
    const id = href.slice(1);
    if (id === 'blog-page') {
      runAfterMenu(() => navigate('blog'));
      return;
    }
    if (isSecondaryPage) {
      if (id !== 'home') {
        try { sessionStorage.setItem('nb-scroll-target', id); } catch { /* storage blocked: scroll just won't resume */ }
      }
      runAfterMenu(() => navigate('home'));
    } else {
      runAfterMenu(() => smoothScrollToId(id));
    }
  }, [isSecondaryPage, navigate, runAfterMenu]);

  const handleLogo = useCallback(() => {
    if (isSecondaryPage) runAfterMenu(() => navigate('home'));
    else runAfterMenu(() => smoothScrollToId('home'));
  }, [isSecondaryPage, navigate, runAfterMenu]);

  const handleProduct = useCallback((action) => {
    setOpenDd(null);
    runAfterMenu(() => {
      if (action === 'book-lb') navigate('lb');
      else if (action === 'view-lb') navigate('demo');
      else if (action === 'book-mammo') navigate('mammo');
      else if (action === 'view-mammo') window.open('https://www.oncotrace-ai.org/mammodemo/ui', '_blank', 'noopener,noreferrer');
    });
  }, [navigate, runAfterMenu]);

  const toggleDd = (which, e) => {
    // detail === 0: activated from the keyboard (Enter/Space), not a pointer.
    setDdByKeyboard(e.detail === 0);
    setOpenDd((cur) => (cur === which ? null : which));
  };
  const closeDd = useCallback(() => setOpenDd(null), []);

  const toggleMenu = () => {
    setOpenDd(null);
    if (menuOpen) closeMenu();
    else setMenuOpen(true);
  };

  const pageLabel =
    currentPage === 'demo' ? 'LB Demo Mode'
    : currentPage === 'lb' ? 'LB Booking'
    : currentPage === 'mammo' ? 'Mammo Booking'
    : currentPage === 'blog' ? 'Blog'
    : currentPage === 'notfound' ? 'Page not found'
    : 'Demo Mode';

  const ddTrigger = (which, label, ref, panelId, primary, LeadIcon) => (
    <button
      ref={ref}
      type="button"
      onClick={(e) => toggleDd(which, e)}
      aria-expanded={openDd === which}
      aria-haspopup="menu"
      aria-controls={panelId}
      className={`ot-btn ot-btn-sm ${primary ? 'ot-btn-primary' : 'ot-btn-secondary'}`}
    >
      <LeadIcon size={16} stroke={1.8} aria-hidden="true" className={`hidden min-[1440px]:block ${primary ? '' : 'text-brand'}`} />
      {label}
      <IconChevronDown
        size={15} stroke={2} aria-hidden="true"
        className={`transition-transform duration-300 ${openDd === which ? 'rotate-180' : ''}`}
      />
    </button>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ══ FIXED BAR ══════════════════════════════════════════════════════ */}
      <div className="fixed left-0 right-0 top-0 z-[9999]">
        <NavIconGradient />
        <header
          className={`relative flex h-[var(--nav-h)] items-center justify-between gap-4 border-b px-[clamp(1rem,3vw,2.25rem)] transition-[background-color,border-color,box-shadow] duration-300 ${
            scrolled || menuOpen
              ? 'border-hairline bg-white/90 shadow-[0_1px_0_rgb(15_23_42/0.02),0_8px_24px_-16px_rgb(15_23_42/0.18)] backdrop-blur-xl'
              : 'border-transparent bg-white/70 backdrop-blur-md'
          }`}
        >
          {/* ── Logo ── */}
          <button
            type="button"
            onClick={handleLogo}
            aria-label="OncoTrace-AI, go to homepage"
            className="relative z-[10001] flex flex-shrink-0 items-center rounded-lg transition-opacity hover:opacity-85"
          >
            {logoError ? (
              <span className="text-lg font-bold tracking-tight text-ink">OncoTrace-AI</span>
            ) : (
              // The mobile LCP element: shown 48-64px tall, so a phone loads
              // the 128/192px file instead of the 264px one.
              <img
                src="/oncotrace-ai-logo.webp"
                srcSet="/oncotrace-ai-logo-128.webp 128w, /oncotrace-ai-logo-192.webp 192w, /oncotrace-ai-logo.webp 264w"
                sizes="(min-width: 1024px) 64px, (min-width: 640px) 56px, 48px"
                alt="OncoTrace-AI"
                width={264}
                height={264}
                draggable={false}
                onError={() => setLogoError(true)}
                className="pointer-events-none block h-12 w-auto select-none object-contain sm:h-14 lg:h-16"
              />
            )}
          </button>

          {/* ── Desktop nav ── */}
          <nav aria-label="Main navigation" className="hidden flex-1 items-center justify-center xl:flex">
            <ul role="list" className="m-0 flex list-none items-center gap-0.5 p-0">
              {isSecondaryPage ? (
                <li>
                  <span aria-live="polite" className="ot-kicker rounded-full border border-brand-line bg-brand-soft px-3.5 py-1.5">
                    {pageLabel}
                  </span>
                </li>
              ) : (
                NAV_LINKS.map(({ label, href, external, Icon }) => (
                  <li key={label}>
                    {external ? (
                      <a
                        href={external}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nb-nav-btn group relative inline-flex min-h-[40px] items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[0.875rem] 2xl:px-3 font-medium text-body transition-colors hover:text-ink"
                      >
                        <NavIcon Icon={Icon} />
                        {label}
                        <IconArrowUpRight size={14} stroke={2} aria-hidden="true" className="text-muted" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNavClick(href)}
                        aria-current={effectiveActive === href ? 'page' : undefined}
                        className={`nb-nav-btn group relative inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[0.875rem] 2xl:px-3 transition-colors ${
                          effectiveActive === href ? 'nb-active font-semibold text-ink' : 'font-medium text-body hover:text-ink'
                        }`}
                      >
                        <NavIcon Icon={Icon} />
                        {label}
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </nav>

          {/* ── Desktop actions ── */}
          <div role="group" aria-label="Product actions" className="hidden flex-shrink-0 items-center gap-2 xl:flex">
            {isSecondaryPage ? (
              <button type="button" onClick={() => navigate('home')} className="ot-btn ot-btn-sm ot-btn-primary">
                <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
                Back to Home
              </button>
            ) : (
              <>
                <div className="relative">
                  {ddTrigger('book', 'Book Demo', bookTriggerRef, 'nb-dd-panel-booking', false, IconCalendarEvent)}
                  <AnimatePresence>
                    {openDd === 'book' && (
                      <DesktopDropdown
                        key="book"
                        links={BOOKING_LINKS}
                        ariaLabel="Book a demo"
                        panelId="nb-dd-panel-booking"
                        onAction={handleProduct}
                        onClose={closeDd}
                        triggerRef={bookTriggerRef}
                        focusFirst={ddByKeyboard}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  {ddTrigger('view', 'View Demo', viewTriggerRef, 'nb-dd-panel-products', true, IconPlayerPlay)}
                  <AnimatePresence>
                    {openDd === 'view' && (
                      <DesktopDropdown
                        key="view"
                        links={PRODUCT_LINKS}
                        ariaLabel="Products"
                        panelId="nb-dd-panel-products"
                        onAction={handleProduct}
                        onClose={closeDd}
                        triggerRef={viewTriggerRef}
                        focusFirst={ddByKeyboard}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* ── Hamburger ── */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="nb-mobile-drawer"
            className={`relative z-[10001] flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center gap-[5px] rounded-full border transition-colors xl:hidden ${
              menuOpen ? 'border-brand-line bg-brand-soft' : 'border-hairline bg-white'
            }`}
          >
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                aria-hidden="true"
                className={`block h-[1.5px] w-[18px] origin-center rounded bg-ink transition-transform duration-300 ${
                  menuOpen && n === 1 ? 'translate-y-[6.5px] rotate-45' : ''
                } ${menuOpen && n === 2 ? 'scale-x-0 opacity-0' : ''} ${menuOpen && n === 3 ? '-translate-y-[6.5px] -rotate-45' : ''}`}
              />
            ))}
          </button>

          {/* ── Scroll progress (decorative; driven by a motion value) ── */}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-1px] left-0 right-0 h-[2px] origin-left bg-brand"
            style={{ scaleX: scrollYProgress }}
          />
        </header>
      </div>

      {/* ══ MOBILE MENU ════════════════════════════════════════════════════ */}
      <AnimatePresence onExitComplete={onDrawerExitComplete}>
        {menuOpen && (
          <m.div
            key="overlay"
            aria-hidden="true"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9997] bg-ink/30 backdrop-blur-[2px] xl:hidden"
          />
        )}
        {menuOpen && (
          <MobileDrawer
            key="drawer"
            onClose={closeMenu}
            isSecondaryPage={isSecondaryPage}
            pageLabel={pageLabel}
            activeHref={effectiveActive}
            onNavClick={handleNavClick}
            onProduct={handleProduct}
            onHome={() => runAfterMenu(() => navigate('home'))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
