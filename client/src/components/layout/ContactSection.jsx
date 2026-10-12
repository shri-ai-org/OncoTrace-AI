import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { IconAlertCircle, IconCircleCheck, IconMail, IconPhone, IconSend } from "@tabler/icons-react";
import Reveal from "../motion/Reveal";
import { Button } from "../ui/Button";
import { EMAIL, PHONE } from "../../lib/site";

const FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", maxLength: 120 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "organization", label: "Organization", type: "text", autoComplete: "organization", maxLength: 160 },
];

// Falls back to the liquid-biopsy template so enquiries still reach the same
// inbox if a dedicated contact template hasn't been created yet. Create one and
// set VITE_EMAILJS_TEMPLATE_ID_CONTACT for correctly-formatted contact emails.
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID_LB;
const TEMPLATE_ID =
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CONTACT
  || import.meta.env.VITE_EMAILJS_TEMPLATE_ID_LB;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const EMPTY = { name: "", email: "", organization: "", message: "" };

/* "Connect With Us": the homepage's closing band (#cta, the Navbar's
   "Contact" target). The deep-ink surface is the one deliberate dark block
   on the page and flows straight into the site footer. */
export default function ContactSection() {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // Guards the post-await setState calls below: the page can unmount (route
  // change) while a send is in flight.
  const isMountedRef = useRef(true);
  const successTimer = useRef(null);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(successTimer.current);
    };
  }, []);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSendError("");
    // A previous success message's timer must not cut this one short.
    clearTimeout(successTimer.current);
    setSubmitted(false);

    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      // Never show success when nothing was sent.
      setSendError(
        "The contact form isn't configured right now. Please email us directly at info@oncotraceai.org.",
      );
      return;
    }

    setSending(true);
    try {
      // Loaded on submit, not with the page: almost no visitor sends the form.
      const { default: emailjs } = await import("@emailjs/browser");
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: form.name,
          from_email: form.email,
          organization: form.organization || "Not provided",
          message: form.message || "No message provided.",
          product: "Website contact form (Partner With Us)",
        },
        PUBLIC_KEY,
      );
      if (!isMountedRef.current) return;
      setSubmitted(true);
      setForm(EMPTY);
      successTimer.current = setTimeout(() => {
        if (isMountedRef.current) setSubmitted(false);
      }, 6000);
    } catch (err) {
      console.error("Contact form send failed:", err);
      if (isMountedRef.current) {
        setSendError(
          "Something went wrong sending your message. Please try again, or email us at info@oncotraceai.org.",
        );
      }
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  };

  return (
    <section id="cta" className="ot-night relative overflow-hidden" aria-labelledby="cta-heading">
      <div className="ot-container ot-section relative grid gap-12 max-sm:gap-8 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5 lg:pt-4">
          <p className="ot-kicker text-[#93c5fd]">BUILD TOGETHER</p>
          <h2 id="cta-heading" className="mt-4 text-[clamp(2rem,1.4rem+2.4vw,3rem)] font-[650] leading-[1.05] tracking-[-0.035em] text-white">
            Connect With Us
          </h2>
          <p className="mt-5 max-w-[42ch] text-[1.0625rem] leading-relaxed text-slate-300 max-sm:mt-4 max-sm:text-[1rem]">
            Interested in a partnership? Reach out to us.
          </p>
          <ul className="mt-8 space-y-3 border-t border-white/10 pt-7 max-sm:mt-6 max-sm:pt-6">
            {[
              { Icon: IconMail, label: EMAIL, href: `mailto:${EMAIL}` },
              { Icon: IconPhone, label: PHONE.display, href: PHONE.href },
            ].map(({ Icon, label, href }) => (
              <li key={href}>
                <a href={href} className="group inline-flex items-center gap-3 rounded-md text-[0.9375rem] text-slate-200 transition-colors hover:text-white">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[#93c5fd] transition-colors group-hover:border-white/20">
                    <Icon size={17} stroke={1.75} aria-hidden="true" />
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.08}>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] max-sm:p-5 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.name} className={field.name === "organization" ? "sm:col-span-2" : undefined}>
                  <label htmlFor={`cta-${field.name}`} className="ot-label ot-label-dark">
                    {field.label}
                  </label>
                  <input
                    id={`cta-${field.name}`}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    maxLength={field.maxLength}
                    value={form[field.name]}
                    onChange={update}
                    required
                    className="ot-input ot-input-dark"
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <label htmlFor="cta-message" className="ot-label ot-label-dark">
                  Message
                </label>
                <textarea
                  id="cta-message"
                  name="message"
                  rows={4}
                  // EmailJS rejects oversized requests (~50 KB) with only a
                  // generic error; keep messages well inside that.
                  maxLength={4000}
                  value={form.message}
                  onChange={update}
                  className="ot-input ot-input-dark resize-y"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" variant="light" disabled={sending} className="w-full tracking-[0.06em] sm:w-auto">
                <IconSend size={17} stroke={1.75} aria-hidden="true" />
                {sending ? "SENDING…" : "SEND MESSAGE"}
              </Button>

              <div aria-live="polite" className="min-h-[1.5rem] text-sm max-sm:min-h-0">
                <AnimatePresence mode="wait" initial={false}>
                  {submitted && (
                    <m.p
                      key="ok"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 font-medium text-emerald-300"
                    >
                      <IconCircleCheck size={18} stroke={1.75} aria-hidden="true" />
                      Thanks! We&apos;ll be in touch.
                    </m.p>
                  )}
                  {sendError && (
                    <m.p
                      key="err"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 font-medium text-red-300"
                    >
                      <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                      {sendError}
                    </m.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
