import { useState, useCallback, useEffect, useRef } from 'react'
import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID_MAMMO
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_MAMMO
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

// Today as YYYY-MM-DD in the visitor's time zone. A function, not a module
// constant: a tab left open past midnight would keep accepting yesterday.
const todayLocal = () => {
  const d = new Date()
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}

// Loose on purpose (international formats): digits and the usual separators,
// with at least 7 digits.
const isPhoneNumber = (value) =>
  /^[\d\s+\-().]+$/.test(value) && value.replace(/\D/g, '').length >= 7

const scopedCSS = `
  .mm-root *, .mm-root *::before, .mm-root *::after { box-sizing: border-box; }

  .mm-root {
    font-family: var(--font-site);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  @keyframes mm-fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mm-check-stroke {
    to { stroke-dashoffset: 0; }
  }
  @keyframes mm-scale-in {
    0%   { transform: scale(0.65); opacity: 0; }
    65%  { transform: scale(1.06); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes mm-shimmer {
    0%   { background-position: -400% 0; }
    100% { background-position: 400% 0; }
  }
  @keyframes mm-pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.45; transform: scale(0.8); }
  }
  @keyframes mm-ripple {
    0%   { transform: scale(1); opacity: 0.2; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes mm-spin {
    to { transform: rotate(360deg); }
  }

  .mm-label {
    display: block;
    font-size: 11.5px;
    font-weight: 500;
    color: #6b7280;
    letter-spacing: 0.015em;
    margin-bottom: 5px;
  }

  .mm-input,
  .mm-select,
  .mm-textarea {
    width: 100%;
    min-height: 44px;
    padding: 10px 13px;
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(209,213,219,0.8);
    border-radius: 9px;
    font-family: var(--font-site);
    font-size: 13.5px;
    font-weight: 400;
    color: #111827;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    box-sizing: border-box;
    appearance: none;
    -webkit-appearance: none;
  }

  .mm-input::placeholder,
  .mm-textarea::placeholder { color: #9ca3af; }

  .mm-input:hover:not(:focus),
  .mm-select:hover:not(:focus),
  .mm-textarea:hover:not(:focus) {
    border-color: rgba(156,163,175,0.9);
    background: rgba(255,255,255,0.88);
  }

  .mm-input:focus,
  .mm-select:focus,
  .mm-textarea:focus {
    border-color: rgba(219,39,119,0.7);
    box-shadow: 0 0 0 3px rgba(219,39,119,0.22);
    background: rgba(255,255,255,0.95);
  }

  .mm-input.mm-err,
  .mm-select.mm-err,
  .mm-textarea.mm-err {
    border-color: rgba(239,68,68,0.7);
    box-shadow: 0 0 0 3px rgba(239,68,68,0.08);
  }

  .mm-select {
    padding-right: 36px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 11px center;
    cursor: pointer;
  }
  .mm-select.mm-ph { color: #9ca3af; }

  .mm-textarea {
    resize: vertical;
    min-height: 86px;
    line-height: 1.6;
  }

  .mm-error-msg {
    font-size: 11px;
    color: #ef4444;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 3px;
  }

  .mm-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: mm-spin 0.65s linear infinite;
    flex-shrink: 0;
  }

  .mm-checkbox {
    width: 16px; height: 16px; min-width: 16px;
    border: 1.5px solid rgba(209,213,219,0.9);
    border-radius: 4px;
    background: rgba(255,255,255,0.8);
    appearance: none; -webkit-appearance: none;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
    margin-top: 1px;
    flex-shrink: 0;
  }
  .mm-checkbox:checked { background: #db2777; border-color: #db2777; }
  .mm-checkbox:checked::after {
    content: '';
    position: absolute;
    top: 1px; left: 4px;
    width: 5px; height: 9px;
    border: 1.5px solid #fff;
    border-top: none; border-left: none;
    transform: rotate(45deg);
  }
  .mm-checkbox:focus { box-shadow: 0 0 0 3px rgba(219,39,119,0.3); outline: none; }

  .mm-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0 18px;
  }
  .mm-divider span {
    font-size: 10.5px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    white-space: nowrap;
  }
  .mm-divider::before,
  .mm-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(209,213,219,0.5), transparent);
  }

  .mm-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 26px;
    border-radius: 9px;
    font-family: var(--font-site);
    font-size: 13.5px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
    border: none;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    min-height: 43px;
    white-space: nowrap;
    box-shadow: 0 3px 14px rgba(219,39,119,0.28), inset 0 1px 0 rgba(255,255,255,0.12);
    letter-spacing: 0.005em;
  }
  .mm-btn:not(:disabled):hover {
    transform: translateY(-1.5px);
    box-shadow: 0 7px 22px rgba(219,39,119,0.32), inset 0 1px 0 rgba(255,255,255,0.12);
    background: linear-gradient(135deg, #e4358a 0%, #c81f68 100%);
  }
  .mm-btn:not(:disabled):active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(219,39,119,0.2);
  }
  .mm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .mm-btn .mm-shine {
    position: absolute; top: 0; left: -120%;
    width: 55%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
    transition: left 0.55s ease;
  }
  .mm-btn:not(:disabled):hover .mm-shine { left: 160%; }

  .mm-back-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 40px;
    padding: 7px 13px;
    border-radius: 8px;
    font-family: var(--font-site);
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    background: rgba(255,255,255,0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(209,213,219,0.7);
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .mm-back-btn:hover {
    background: rgba(255,255,255,0.85);
    border-color: rgba(156,163,175,0.8);
    transform: translateX(-1px);
  }

  @media (max-width: 900px) {
    .mm-layout { grid-template-columns: 1fr !important; }
    .mm-sidebar-wrap { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px; }
    .mm-sidebar-bottom { display: none !important; }
  }
  @media (max-width: 580px) {
    .mm-subnav { padding: 0 16px !important; }
    .mm-sidebar-wrap { grid-template-columns: 1fr !important; }
    .mm-grid-2 { grid-template-columns: 1fr !important; }
    .mm-grid-3 { grid-template-columns: 1fr !important; }
    .mm-submit-row { flex-direction: column !important; align-items: stretch !important; }
    .mm-btn { width: 100%; }
  }
  @media (min-width: 581px) {
    .mm-grid-2 { grid-template-columns: 1fr 1fr; }
    .mm-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  }
`

const TIME_ZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
  'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
]

const PRIMARY_INTERESTS = [
  'Early-Stage Breast Cancer Detection',
  'Mammogram Risk Stratification',
  'Dense Breast Tissue Analysis',
  'AI-Assisted Radiologist Workflow',
  'Screening Programme Optimisation',
  'False-Positive / False-Negative Reduction',
  'Calcification & Mass Detection',
  'Lesion Classification & Grading',
  'Longitudinal Patient Monitoring',
  'Hospital / Radiology Centre Integration',
  'Research & Clinical Trials',
  'Other',
]

const ROLES = [
  'Radiologist', 'Breast Imaging Specialist', 'Oncologist', 'Pathologist',
  'Chief of Radiology', 'Hospital Administrator', 'Lab / Imaging Director',
  'Clinical Data Analyst', 'Researcher / Scientist', 'Other',
]

const TEAM_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

const getInitial = () => ({
  firstName: '', lastName: '', email: '', organization: '',
  role: '', phone: '', primaryInterest: '',
  date: '', time: '', timeZone: '', teamSize: '', message: '', consent: false,
})

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const Ic = {
  ArrowLeft: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  ),
  Phone: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.16 7.84a16 16 0 006 6l1.2-1.2a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  ),
  Mail: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" />
    </svg>
  ),
  Calendar: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Shield: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Globe: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  Scan: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2" /><path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" /><path d="M7 21H5a2 2 0 01-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  ),
  Check: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: ({ size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Lock: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Zap: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Code: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Users: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  Activity: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Home: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Eye: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  BarChart: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
}

// ── Reusable helpers ───────────────────────────────────────────────────────────
function FieldError({ msg, id }) {
  if (!msg) return null
  return (
    <p id={id} className="mm-error-msg">
      <Ic.AlertCircle size={11} />
      {msg}
    </p>
  )
}

function Field({ label, required, error, children, htmlFor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label className="mm-label" htmlFor={htmlFor}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      <FieldError msg={error} id={htmlFor ? `${htmlFor}-error` : undefined} />
    </div>
  )
}

const glassCard = {
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.60)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.055), 0 1px 4px rgba(0,0,0,0.025), inset 0 1px 0 rgba(255,255,255,0.75)',
}

const glassCardSubtle = {
  background: 'rgba(255,255,255,0.50)',
  backdropFilter: 'blur(16px) saturate(145%)',
  WebkitBackdropFilter: 'blur(16px) saturate(145%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.68)',
}

const iconBox = {
  width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
  background: 'rgba(253,242,248,0.85)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: '1px solid rgba(251,207,232,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#db2777',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ onBack }) {
  // This replaces a long form the visitor submitted from its bottom: bring
  // the confirmation into view and move focus to it (the submit button that
  // had focus is gone, which would leave focus on <body>).
  const headingRef = useRef(null)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      className="mm-root"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fff0f8 0%, #fafafa 50%, #fff0f6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{scopedCSS}</style>

      <div style={{ position: 'fixed', top: '-120px', right: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(219,39,119,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-100px', left: '-60px', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 50,
        background: 'linear-gradient(90deg, #be185d, #ec4899, #f9a8d4, #ec4899, #be185d)',
        backgroundSize: '400% 100%', animation: 'mm-shimmer 3.5s linear infinite',
      }} />

      <div
        style={{
          ...glassCard,
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '460px',
          width: '100%',
          padding: '56px 36px',
          animation: 'mm-fade-up 0.5s ease both',
        }}
      >
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 28px', animation: 'mm-scale-in 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(219,39,119,0.1)', animation: 'mm-ripple 1.6s ease-out 0.5s forwards' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(219,39,119,0.06)', animation: 'mm-ripple 1.6s ease-out 0.85s forwards' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #be185d)', boxShadow: '0 10px 36px rgba(219,39,119,0.32)' }} />
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 80 80" fill="none">
            <path
              d="M23 41L34 52L57 29"
              stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 65, strokeDashoffset: 65, animation: 'mm-check-stroke 0.45s ease-out 0.65s forwards' }}
            />
          </svg>
        </div>

        <h2 ref={headingRef} tabIndex={-1} style={{ fontSize: '27px', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em', margin: '0 0 10px', outline: 'none' }}>
          Request Received
        </h2>
        <p style={{ fontSize: '14.5px', color: '#6b7280', fontWeight: 400, lineHeight: 1.65, margin: '0 0 6px' }}>
          Our <span style={{ color: '#db2777', fontWeight: 500 }}>MammoAI</span> team has received your demo request and will be in touch shortly to explore how our AI-powered mammogram analysis can best serve your clinical needs.
        </p>
        <p style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 400, margin: '0 0 36px' }}>
          Keep an eye on your inbox — we'll coordinate from there.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '32px', animation: 'mm-fade-up 0.5s ease 0.35s both' }}>
          {[
            { icon: <Ic.Mail size={15} />, label: 'Confirmation', sub: 'Sent to your inbox' },
            { icon: <Ic.Users size={15} />, label: 'Team Review', sub: "We'll reach out soon" },
            { icon: <Ic.Scan size={15} />, label: 'Demo', sub: 'Tailored for you' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(255,255,255,0.65)',
                borderRadius: '11px', padding: '14px 10px', textAlign: 'center',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '7px', color: '#db2777' }}>{s.icon}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 400 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '10px 22px', borderRadius: '9px',
            fontSize: '13.5px', fontWeight: 600,
            background: '#111827', color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(0,0,0,0.18)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#1f2937'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#111827'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.18)'
          }}
        >
          <Ic.Home size={14} />
          Back to Home
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MammogramBooking({ onBack }) {
  const [formData, setFormData] = useState(getInitial)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  // The "Back" button stays enabled while a submit is in flight (it navigates
  // away rather than being disabled), so the EmailJS request can resolve
  // after this component has already unmounted -- guard every post-await
  // setState with this. It is set on every mount, not just initialised:
  // StrictMode's dev-only unmount/remount would otherwise leave it false.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Move focus to a send error, right above the submit button: disabling the
  // button while sending dropped focus to <body>.
  const sendErrorRef = useRef(null)
  useEffect(() => {
    if (!sendError) return
    sendErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    sendErrorRef.current?.focus({ preventScroll: true })
  }, [sendError])

  const handleChange = useCallback((field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }, [])

  // Checked in on-screen order: the first error found is the field that
  // receives focus.
  const validate = (data) => {
    const e = {}
    if (!data.firstName.trim()) e.firstName = 'First name is required.'
    if (!data.lastName.trim()) e.lastName = 'Last name is required.'
    if (!data.email.trim()) e.email = 'Work email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Enter a valid email address.'
    if (!data.phone.trim()) e.phone = 'Phone is required.'
    else if (!isPhoneNumber(data.phone.trim())) e.phone = 'Enter a valid phone number.'
    if (!data.organization.trim()) e.organization = 'Organization is required.'
    if (!data.role) e.role = 'Please select a role.'
    if (!data.primaryInterest) e.primaryInterest = 'Please select a primary interest.'
    // The input's min attribute isn't enforced (noValidate) and a typed date
    // can be anything; compare against today at submit time.
    if (!data.date) e.date = 'Preferred date is required.'
    else if (data.date < todayLocal()) e.date = 'Please choose today or a later date.'
    if (!data.time) e.time = 'Preferred time is required.'
    if (!data.teamSize) e.teamSize = 'Team size is required.'
    if (!data.timeZone) e.timeZone = 'Time zone is required.'
    if (!data.consent) e.consent = 'Please agree to be contacted.'
    return e
  }


  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (sending) return
    setSendError('')
    const errs = validate(formData)
    if (Object.keys(errs).length) {
      setErrors(errs)
      const first = document.getElementById(`mm-${Object.keys(errs)[0]}`)
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first?.focus({ preventScroll: true })
      return
    }
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      setSendError('Email service is not configured properly.')
      return
    }
    setSending(true)
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: `${formData.firstName} ${formData.lastName}`,
          from_email: formData.email,
          phone: formData.phone || 'Not provided',
          organization: formData.organization,
          role: formData.role || 'Not specified',
          primary_interest: formData.primaryInterest || 'Not specified',
          preferred_date: formData.date || 'Not specified',
          preferred_time: formData.time || 'Not specified',
          time_zone: formData.timeZone || 'Not specified',
          team_size: formData.teamSize || 'Not specified',
          message: formData.message || 'No additional notes.',
          consent: formData.consent ? 'Yes – agreed to be contacted' : 'No',
          product: 'MammoAI – AI-Powered Mammogram Risk Analysis',
        },
        PUBLIC_KEY
      )
      if (isMountedRef.current) setSubmitted(true)
    } catch (err) {
      console.error('EmailJS error:', err)
      if (isMountedRef.current) setSendError('Something went wrong. Please try again or email us at info@oncotraceai.org.')
    } finally {
      if (isMountedRef.current) setSending(false)
    }
  }, [formData, sending])

  if (submitted) {
    return <SuccessScreen onBack={() => { setSubmitted(false); onBack?.() }} />
  }

  const fieldA11y = (field) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `mm-${field}-error` : undefined,
  })
  const ic = (field) => `mm-input${errors[field] ? ' mm-err' : ''}`
  const sc = (field, val) => `mm-select${!val ? ' mm-ph' : ''}${errors[field] ? ' mm-err' : ''}`

  return (
    <>
      <style>{scopedCSS}</style>
      <div
        className="mm-root"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(145deg, #fff0f8 0%, #f8fafc 40%, #fff0f6 80%, #fafafa 100%)',
          position: 'relative',
          overflowX: 'hidden',
        }}
      >
        <div style={{ position: 'fixed', top: '-140px', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(219,39,119,0.065) 0%, transparent 68%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-120px', left: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 68%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(251,207,232,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Navbar ── */}
        <nav aria-label="Booking page" style={{
          position: 'relative', zIndex: 2,
          background: 'rgba(255,248,252,0.72)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderBottom: '1px solid rgba(251,207,232,0.4)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
        }}>
          <div className="mm-subnav" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px', minHeight: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <button onClick={onBack} type="button" className="mm-back-btn">
              <Ic.ArrowLeft />
              Back
            </button>

            <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', letterSpacing: '-0.015em', userSelect: 'none', whiteSpace: 'nowrap' }}>
              Mammo<span style={{ color: '#db2777' }}>AI</span><span style={{ fontWeight: 300, color: '#94a3b8' }}>‑Risk</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'mm-pulse-dot 2.2s infinite' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Live Platform</span>
            </div>
          </div>
        </nav>

        {/* ── Page ── */}
        <main style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto', padding: '52px 32px 80px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '40px', animation: 'mm-fade-up 0.55s ease both' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 13px', borderRadius: '20px', marginBottom: '18px',
              background: 'rgba(253,242,248,0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(251,207,232,0.7)',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#db2777', animation: 'mm-pulse-dot 2s infinite' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9d174d', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                AI-Powered Mammogram Analysis
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 14px', maxWidth: '620px' }}>
              Book a Live Demo
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 400, lineHeight: 1.68, margin: 0, maxWidth: '540px' }}>
              See how MammoAI‑Risk revolutionises breast cancer screening with deep-learning mammogram interpretation, real-time risk stratification, and radiologist-grade AI insights — configured for your clinical environment.
            </p>
          </div>

          {/* ── Two-column layout ── */}
          <div
            className="mm-layout"
            style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}
          >

            {/* ── Form Card ── */}
            <div
              style={{
                ...glassCard,
                borderRadius: '18px',
                padding: '36px 40px',
                animation: 'mm-fade-up 0.55s ease 0.07s both',
              }}
            >
              {/* Feature chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '30px', paddingBottom: '24px', borderBottom: '1px solid rgba(226,232,240,0.5)' }}>
                {[
                  { label: 'AI Risk Scoring', icon: <Ic.Zap size={11} /> },
                  { label: 'Dense Tissue Analysis', icon: <Ic.Scan size={11} /> },
                  { label: 'Lesion Detection', icon: <Ic.Eye size={11} /> },
                  { label: 'Real-time Reporting', icon: <Ic.Activity size={11} /> },
                  { label: 'Multi-Site Screening', icon: <Ic.Shield size={11} /> },
                  { label: 'EHR Integration', icon: <Ic.BarChart size={11} /> },
                ].map((f, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11.5px', fontWeight: 500,
                      color: '#475569',
                      background: 'rgba(248,250,252,0.75)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      border: '1px solid rgba(226,232,240,0.7)',
                      borderRadius: '7px', padding: '4px 10px',
                    }}
                  >
                    <span style={{ color: '#db2777', opacity: 0.8 }}>{f.icon}</span>
                    {f.label}
                  </span>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate>

                {/* ── Contact Info ── */}
                <div className="mm-divider"><span>Contact Information</span></div>

                <div className="mm-grid-2" style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                  <Field label="First Name" required error={errors.firstName} htmlFor="mm-firstName">
                    <input id="mm-firstName" {...fieldA11y('firstName')} type="text" className={ic('firstName')} placeholder="Sarah" value={formData.firstName} onChange={handleChange('firstName')} />
                  </Field>
                  <Field label="Last Name" required error={errors.lastName} htmlFor="mm-lastName">
                    <input id="mm-lastName" {...fieldA11y('lastName')} type="text" className={ic('lastName')} placeholder="Chen" value={formData.lastName} onChange={handleChange('lastName')} />
                  </Field>
                </div>

                <div className="mm-grid-2" style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                  <Field label="Work Email" required error={errors.email} htmlFor="mm-email">
                    <input id="mm-email" {...fieldA11y('email')} type="email" className={ic('email')} placeholder="you@hospital.org" value={formData.email} onChange={handleChange('email')} />
                  </Field>
                  <Field label="Phone" required error={errors.phone} htmlFor="mm-phone">
                    <input id="mm-phone" {...fieldA11y('phone')} type="tel" className={ic('phone')} placeholder="+1 555 000 0000" value={formData.phone} onChange={handleChange('phone')} />
                  </Field>
                </div>

                <div className="mm-grid-2" style={{ display: 'grid', gap: '16px', marginBottom: '28px' }}>
                  <Field label="Organization" required error={errors.organization} htmlFor="mm-organization">
                    <input id="mm-organization" {...fieldA11y('organization')} type="text" className={ic('organization')} placeholder="Mayo Clinic" value={formData.organization} onChange={handleChange('organization')} />
                  </Field>
                  <Field label="Role / Title" required error={errors.role} htmlFor="mm-role">
                    <select id="mm-role" {...fieldA11y('role')} className={sc('role', formData.role)} value={formData.role} onChange={handleChange('role')}>
                      <option value="">Select role…</option>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>

                {/* ── Demo Preferences ── */}
                <div className="mm-divider"><span>Demo Preferences</span></div>

                <div style={{ marginBottom: '16px' }}>
                  <Field label="Primary Interest" required error={errors.primaryInterest} htmlFor="mm-primaryInterest">
                    <select id="mm-primaryInterest" {...fieldA11y('primaryInterest')} className={sc('primaryInterest', formData.primaryInterest)} value={formData.primaryInterest} onChange={handleChange('primaryInterest')}>
                      <option value="">Select area of interest…</option>
                      {PRIMARY_INTERESTS.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="mm-grid-3" style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                  <Field label="Preferred Date" required error={errors.date} htmlFor="mm-date">
                    <input id="mm-date" {...fieldA11y('date')} type="date" className={ic('date')} value={formData.date} onChange={handleChange('date')} min={todayLocal()} style={{ colorScheme: 'light' }} />
                  </Field>
                  <Field label="Preferred Time" required error={errors.time} htmlFor="mm-time">
                    <input id="mm-time" {...fieldA11y('time')} type="time" className={ic('time')} value={formData.time} onChange={handleChange('time')} style={{ colorScheme: 'light' }} />
                  </Field>
                  <Field label="Team Size" required error={errors.teamSize} htmlFor="mm-teamSize">
                    <select id="mm-teamSize" {...fieldA11y('teamSize')} className={sc('teamSize', formData.teamSize)} value={formData.teamSize} onChange={handleChange('teamSize')}>
                      <option value="">Select…</option>
                      {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <Field label="Time Zone" required error={errors.timeZone} htmlFor="mm-timeZone">
                    <select id="mm-timeZone" {...fieldA11y('timeZone')} className={sc('timeZone', formData.timeZone)} value={formData.timeZone} onChange={handleChange('timeZone')}>
                      <option value="">Select your time zone…</option>
                      {TIME_ZONES.map(tz => (
                        <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* ── Notes ── */}
                <div className="mm-divider"><span>Additional Notes</span></div>

                <div style={{ marginBottom: '22px' }}>
                  <Field label="Goals / Notes" htmlFor="mm-message">
                    <textarea
                      id="mm-message"
                      className="mm-textarea"
                      placeholder="Tell us about your radiology workflows, imaging volumes, current screening challenges, or any specific questions — we'll tailor the demo accordingly."
                      value={formData.message}
                      onChange={handleChange('message')}
                      rows={3}
                    />
                  </Field>
                </div>

                {/* Consent */}
                <div
                  style={{
                    padding: '14px 16px', borderRadius: '11px', marginBottom: '20px',
                    background: errors.consent ? 'rgba(254,242,242,0.8)' : 'rgba(249,250,251,0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${errors.consent ? 'rgba(252,165,165,0.7)' : 'rgba(229,231,235,0.6)'}`,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }} htmlFor="mm-consent">
                    <input id="mm-consent" type="checkbox" aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'mm-consent-error' : undefined} className="mm-checkbox" checked={formData.consent} onChange={handleChange('consent')} />
                    <span style={{ fontSize: '12.5px', color: '#4b5563', lineHeight: 1.6, fontWeight: 400 }}>
                      I agree to be contacted by the{' '}
                      <span style={{ color: '#db2777', fontWeight: 500 }}>MammoAI‑Risk</span>{' '}
                      team regarding this demo request and consent to my information being used for follow-up purposes.{' '}
                      <span style={{ color: '#9ca3af' }}>Your data remains private and is never sold.</span>
                    </span>
                  </label>
                  <FieldError msg={errors.consent} id="mm-consent-error" />
                </div>

                {/* Send error */}
                {sendError && (
                  <div ref={sendErrorRef} role="alert" tabIndex={-1} style={{
                    padding: '13px 16px', borderRadius: '10px', marginBottom: '18px',
                    background: 'rgba(254,242,242,0.85)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(252,165,165,0.6)',
                    fontSize: '13px', color: '#dc2626', lineHeight: 1.55,
                  }}>
                    {sendError}
                  </div>
                )}

                {/* Submit row */}
                <div
                  className="mm-submit-row"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}
                >
                  <button type="submit" className="mm-btn" disabled={sending}>
                    <span className="mm-shine" />
                    {sending ? (
                      <>
                        <span className="mm-spinner" />
                        <span style={{ position: 'relative', zIndex: 1 }}>Sending…</span>
                      </>
                    ) : (
                      <>
                        <span style={{ position: 'relative', zIndex: 1, display: 'flex' }}><Ic.Scan size={14} /></span>
                        <span style={{ position: 'relative', zIndex: 1 }}>Request Demo</span>
                      </>
                    )}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#94a3b8', display: 'flex' }}><Ic.Lock size={12} /></span>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 400 }}>
                      Encrypted in transit · Research / pilot use only
                    </span>
                  </div>
                </div>

              </form>
            </div>

            {/* ── Sidebar ── */}
            <div
              className="mm-sidebar-wrap"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'mm-fade-up 0.55s ease 0.14s both' }}
            >

              {/* What to expect */}
              <div style={{ ...glassCardSubtle, borderRadius: '15px', padding: '22px' }}>
                <h2 style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.005em' }}>
                  What to Expect
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {[
                    { icon: <Ic.Calendar size={14} />, title: 'Guided walkthrough', sub: 'A focused session with our team' },
                    { icon: <Ic.Scan size={14} />, title: 'Personalised demo', sub: 'Tailored to your imaging workflow' },
                    { icon: <Ic.Users size={14} />, title: 'Expert Q&A', sub: 'Direct access to AI specialists' },
                    { icon: <Ic.Check size={14} />, title: 'No commitment', sub: 'Explore freely, decide later' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                      <div style={iconBox}>{item.icon}</div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{item.title}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform capabilities */}
              <div style={{ ...glassCardSubtle, borderRadius: '15px', padding: '22px' }}>
                <h2 style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.005em' }}>
                  Platform Capabilities
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {[
                    'AI mammogram risk stratification',
                    'Dense breast tissue classification',
                    'Microcalcification detection',
                    'Mass & lesion localisation',
                    'False-positive reduction engine',
                    'Radiologist workflow integration',
                    'EHR / PACS / LIS ready',
                    'Multi-site screening support',
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                        background: 'rgba(253,242,248,0.9)',
                        border: '1px solid rgba(251,207,232,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#db2777',
                      }}>
                        <Ic.Check size={10} />
                      </div>
                      <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 400 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust + contact */}
              <div className="mm-sidebar-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  background: 'rgba(255,248,252,0.6)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(251,207,232,0.45)',
                  borderRadius: '13px', padding: '16px 18px',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)',
                }}>
                  {[
                    { icon: <Ic.Lock size={12} />, text: 'Encrypted in transit' },
                    { icon: <Ic.Zap size={12} />, text: 'Response within 24h' },
                    { icon: <Ic.Code size={12} />, text: 'Open source core' },
                    { icon: <Ic.Globe size={12} />, text: 'Global clinical teams' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#6b7280', display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: 'rgba(253,242,248,0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(251,207,232,0.5)',
                  borderRadius: '13px', padding: '14px 18px',
                  textAlign: 'center',
                  boxShadow: '0 1px 6px rgba(219,39,119,0.05), inset 0 1px 0 rgba(255,255,255,0.65)',
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#9d174d', marginBottom: '3px' }}>
                    Prefer to reach out directly?
                  </div>
                  <a
                    href="mailto:info@oncotraceai.org"
                    style={{ fontSize: '12px', color: '#db2777', fontWeight: 500, textDecoration: 'none', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    info@oncotraceai.org
                  </a>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  )
}