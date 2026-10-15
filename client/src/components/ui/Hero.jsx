import { useEffect, useRef } from "react";
import { useScroll } from "motion/react";
import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "./Button";
import { heroHold } from "../../lib/layout";
import "./Hero.css";

/* Full-screen hero: grid backdrop, gradient headline, and a glowing horizon
   arc. Ported from the "hero-1" component (shadcn/TypeScript) to this site's
   stack: the site Button, Tabler icons, and CSS-only entrance animations
   that leave everything visible under reduced motion.

   Fills the first screen below the fixed navbar, and the arc always covers
   the bottom ~18.6% of that screen. Type and spacing scale with the
   screen height. All sizing lives in Hero.css.

   `visual` (optional): a decorative element shown in the right 25% on
   desktop, with the copy left-aligned just left of centre; below `lg` it
   sits under the copy, on the arc.

   `capabilities` (optional): [{ label, caption, Icon, href, onSelect, tone }],
   shown as a row of linked cards under the subtitle, where a `cta` button
   would go (pass one or the other).

   `hold` (optional): for one screen-height of scrolling the hero glides up
   at 30% of the scroll speed, so a scroll-driven visual can play out, then
   the page continues at full speed (sizing in Hero.css, lib/layout.js
   heroHold). Native scrolling throughout. The glide is a CSS scroll-driven
   animation (compositor-synced, no jitter); browsers without one get the
   motion-value fallback below. No hold under reduced motion or without
   JavaScript. */
export default function Hero({ eyebrow, title, tagline, subtitle, cta, footnote, capabilities, ariaLabel, visual, hold = false }) {
  const sectionRef = useRef(null);
  const { scrollY } = useScroll();

  useEffect(() => {
    const section = sectionRef.current;
    if (!hold || !section) return undefined;
    const wrap = section.parentElement;
    const cssDriven = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()");
    let geo = null;

    const apply = (y) => {
      if (cssDriven) return;
      const t = geo ? Math.min(1, Math.max(0, (y - geo.start) / geo.distance)) * geo.travel : 0;
      section.style.translate = t ? `0 ${t}px` : "";
    };
    const measure = () => {
      geo = heroHold(section);
      // Read by the scroll-driven animation's range in Hero.css.
      wrap.style.setProperty("--hold-start", `${geo ? geo.start : 0}px`);
      apply(scrollY.get());
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    window.addEventListener("resize", measure);
    const unsubscribe = cssDriven ? undefined : scrollY.on("change", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      unsubscribe?.();
      section.style.translate = "";
    };
  }, [hold, scrollY]);

  const section = (
    <section
      ref={sectionRef}
      className={`ot-hero ${visual ? "ot-hero--split" : ""} ${hold ? "ot-hero--hold" : ""} relative isolate flex w-full flex-col items-center justify-center overflow-hidden px-4 text-center sm:px-6`}
      aria-label={ariaLabel}
    >
      <div className="ot-hero-grid" aria-hidden="true" />
      <div className="ot-hero-arc" aria-hidden="true" />
      <div className="ot-hero-fade" aria-hidden="true" />

      <div className="ot-hero-content relative z-10 flex w-full flex-col items-center">
        <div className="ot-hero-copy mx-auto flex w-full max-w-[64rem] flex-col items-center">
          {eyebrow && <div className="ot-hero-in-1">{eyebrow}</div>}

          <h1
            className="ot-hero-title ot-hero-h1 ot-hero-rise text-balance font-[650] tracking-[-0.04em]"
          >
            {title}
          </h1>

          {tagline && <div className="ot-hero-in-2 ot-hero-tagline">{tagline}</div>}

          {subtitle && (
            <p className="ot-hero-in-2 ot-hero-sub max-w-[46rem] text-balance leading-relaxed text-muted">
              {subtitle}
            </p>
          )}

          {capabilities?.length > 0 && (
            <nav className="ot-hero-caps ot-hero-in-3" aria-label="What we analyse">
              <ul className="ot-hero-caps-list">
                {capabilities.map(({ label, caption, Icon, href, onSelect, tone }) => (
                  <li key={href} className="ot-hero-cap">
                    <a
                      href={href}
                      onClick={(e) => {
                        if (!onSelect) return;
                        e.preventDefault();
                        onSelect();
                      }}
                      className="ot-hero-cap-link"
                      data-tone={tone}
                    >
                      <span className="ot-hero-cap-icon" aria-hidden="true">
                        <Icon size={19} stroke={1.75} />
                      </span>
                      <span className="ot-hero-cap-text">
                        <span className="ot-hero-cap-title">{label}</span>
                        {caption && <span className="ot-hero-cap-caption">{caption}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {cta && (
            <div className="ot-hero-in-3 ot-hero-cta">
              <Button variant="primary" onClick={cta.onClick}>
                {cta.label}
                <IconArrowRight size={17} stroke={1.75} aria-hidden="true" />
              </Button>
            </div>
          )}

          {footnote && <div className="ot-hero-in-4 ot-hero-foot text-[13px] text-muted">{footnote}</div>}
        </div>
      </div>

      {visual}
    </section>
  );

  if (!hold) return section;
  return (
    <div className="ot-hero-hold">
      {section}
      <div className="ot-hero-hold-space" aria-hidden="true" />
    </div>
  );
}
