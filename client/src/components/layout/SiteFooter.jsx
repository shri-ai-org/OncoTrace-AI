import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  IconArrowUpRight, IconBrandLinkedin, IconCheck, IconCopy, IconMail, IconPhone,
} from "@tabler/icons-react";
import { scrollToSection } from "../../lib/scroll";
import { EMAIL, OFFICES, PHONE, TEAM_URL } from "../../lib/site";

// Labels name what each link actually opens (they used to read "How It
// Works" / "Benefits" for the mammogram and liquid biopsy sections).
const EXPLORE = [
  { label: "Mammogram AI", section: "mammogram" },
  { label: "Liquid Biopsy", section: "liquid-biopsy" },
  { label: "Lung Cancer Imaging", section: "lung-imaging" },
  { label: "Blog", route: "blog" },
  { label: "Team", external: TEAM_URL },
];

// Destinations for these don't exist yet; they render as plain text rather
// than links that only jump to the top of the page.
const LEGAL = ["Terms of Service", "Privacy Policy", "Cookies Settings"];

const ICON = { size: 16, stroke: 1.75, "aria-hidden": true };

function ColumnHeading({ children }) {
  return <h2 className="ot-tech mb-4 uppercase tracking-[0.08em] text-slate-400">{children}</h2>;
}

// Touch screens get 40px-tall targets; with a mouse the rows stay compact.
const linkClass =
  "inline-flex items-center gap-1 rounded py-0.5 text-[0.875rem] text-slate-300 transition-colors hover:text-white pointer-coarse:min-h-10";

/* The site footer, on every page except the full-screen /demo app. Layout is
   pure CSS breakpoints (no JS width state), so the prerendered homepage looks
   right on every screen before and after hydration. */
export default function SiteFooter({ onNavigate }) {
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const [copied, setCopied] = useState(null); // null | 'ok' | 'failed'
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const goToSection = useCallback(
    (id) => {
      if (onHome) scrollToSection(id);
      else onNavigate?.(id);
    },
    [onHome, onNavigate],
  );

  const copyEmail = () => {
    const show = (state) => {
      setCopied(state);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2500);
    };
    // Rejects without clipboard permission or outside a secure context: say
    // so, rather than claiming success.
    const write = navigator.clipboard?.writeText(EMAIL);
    if (!write) { show("failed"); return; }
    write.then(() => show("ok"), () => show("failed"));
  };

  return (
    <footer className="relative border-t border-white/[0.07] bg-night text-slate-300">
      <div className="ot-container pb-7 pt-12 sm:pt-14 lg:pt-16">
        {/* Phones: Explore and Contact side by side; stacked below 440px, where
            the email address and its copy button no longer fit beside the
            Explore links (which then use two columns of their own). */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-10 max-[439px]:grid-cols-1 md:grid-cols-12 md:gap-x-8 lg:gap-x-10">
          {/* ── Brand ── */}
          <div className="col-span-full md:col-span-12 lg:col-span-4">
            <p className="text-[1.375rem] font-[650] tracking-[-0.03em] text-white">
              OncoTrace-<span className="text-[#93c5fd]">AI</span>
            </p>
            <p className="mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed text-slate-400">
              Precision oncology intelligence that is open, accessible,
              and built for every community.
            </p>
          </div>

          {/* ── Explore ── */}
          <nav aria-label="Footer" className="md:col-span-3 lg:col-span-2">
            <ColumnHeading>Explore</ColumnHeading>
            <ul className="space-y-2.5 pointer-coarse:space-y-0 max-[439px]:grid max-[439px]:grid-cols-2 max-[439px]:gap-x-6 max-[439px]:gap-y-2.5 max-[439px]:space-y-0">
              {EXPLORE.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.external} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {link.label}
                      <IconArrowUpRight size={13} stroke={2} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => (link.route ? onNavigate?.(link.route) : goToSection(link.section))}
                      className={linkClass}
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Contact ── */}
          <div className="md:col-span-4 lg:col-span-3">
            <ColumnHeading>Contact</ColumnHeading>
            <ul className="space-y-2.5 text-[0.875rem]">
              <li className="flex items-center gap-2">
                <IconMail {...ICON} className="shrink-0 text-slate-500" />
                <a href={`mailto:${EMAIL}`} className="inline-flex items-center rounded py-0.5 text-slate-300 transition-colors hover:text-white pointer-coarse:min-h-10">
                  {EMAIL}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  aria-label={copied === "ok" ? "Email address copied" : "Copy email address"}
                  className="-my-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {copied === "ok" ? <IconCheck size={15} stroke={2} aria-hidden="true" className="text-emerald-300" /> : <IconCopy size={15} stroke={1.75} aria-hidden="true" />}
                </button>
                <span className="sr-only" aria-live="polite">
                  {copied === "ok" ? "Email address copied" : copied === "failed" ? "Couldn't copy. Select the address to copy it." : ""}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <IconPhone {...ICON} className="shrink-0 text-slate-500" />
                <a href={PHONE.href} className="inline-flex items-center whitespace-nowrap rounded py-0.5 text-slate-300 transition-colors hover:text-white pointer-coarse:min-h-10">
                  {PHONE.display}
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <IconBrandLinkedin {...ICON} className="shrink-0 text-slate-500" />
                <span><span className="sr-only">LinkedIn: </span>oncotraceai</span>
              </li>
            </ul>
          </div>

          {/* ── Offices ── */}
          <div className="col-span-full md:col-span-5 lg:col-span-3">
            <ColumnHeading>Offices</ColumnHeading>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-1">
              {OFFICES.map((office) => (
                <address key={office.region} className="not-italic">
                  <p className="text-[0.875rem] font-semibold text-white">{office.region}</p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-400">
                    {office.name}, {office.address}
                  </p>
                  <a
                    href={office.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 rounded py-0.5 text-[0.8125rem] text-slate-300 transition-colors hover:text-white pointer-coarse:min-h-10"
                  >
                    Directions
                    <IconArrowUpRight size={13} stroke={2} aria-hidden="true" />
                    <span className="sr-only">to the {office.region} office (opens Google Maps in a new tab)</span>
                  </a>
                </address>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 flex flex-col gap-2.5 border-t border-white/10 pt-6 text-[0.8125rem] text-slate-400 sm:mt-12 lg:flex-row lg:items-center lg:justify-between">
          <p>© 2026 OncoTrace-AI • All rights reserved • v18.09.2026</p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {LEGAL.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>

        {/* Image credits. The lung CT image is CC BY-SA 4.0, which requires
            attribution, the licence and a note that it was changed. */}
        <p className="mt-4 text-[0.75rem] leading-relaxed text-slate-400">
          CT images via Wikimedia Commons:{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:CT-Thorax-5.0-B70f-Lungs.jpg"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
          >
            Ptrump16
          </a>{" "}
          (
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer license"
            className="rounded underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
          >
            CC BY-SA 4.0
          </a>
          , cropped) and{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:CT_scan_of_lung_cancer_with_cavitation.png"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
          >
            Jmarchn
          </a>{" "}
          (CC0).
        </p>
      </div>
    </footer>
  );
}
