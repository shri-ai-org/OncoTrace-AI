import ThemeToggle from "../ThemeToggle";
import PulseDot from "../primitives/PulseDot";
import { Icon } from "../icons";
import { ICONS } from "../iconPaths";
import { NAV_PAGES } from "../nav";

// The uploaded filename, not a fabricated name -- there is no real
// patient-identity field anywhere in the API response.
function displayNameFromFilename(filename) {
  if (!filename) return null;
  return filename.replace(/\.vcf\.gz$/i, "").replace(/\.vcf$/i, "");
}

export default function DashboardShell({ activePage, onNavigate, meta, tierSummary, callerAdapterValidated = true, theme, toggleTheme, onReset, onBack, children }) {
  const pageTitle = NAV_PAGES.find((p) => p.id === activePage)?.label || "Dashboard";
  const tier1 = tierSummary?.counts?.tier_1_actionable_somatic ?? 0;
  const tier2 = tierSummary?.counts?.tier_2_uncertain_needs_review ?? 0;
  const patientName = displayNameFromFilename(meta.source_filename);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--lb-bg-page)",
      fontFamily: "var(--lb-font-body)", transition: "background 0.5s", display: "flex",
    }}>
      {/* Permanent at >=900px; hidden below it, where the bottom tab bar
          takes over navigation entirely -- a real app-style bottom nav, not
          a drawer, so there's no toggle/backdrop/focus-trap to maintain for
          a surface that's either always visible or never rendered. */}
      <aside
        aria-label="Navigation"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
          width: "220px", background: "var(--lb-bg-surface-raised)",
          borderRight: "1px solid var(--lb-border)",
          display: "none", flexDirection: "column",
        }} className="lb-sidebar">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--lb-border)", flexShrink: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--lb-text-primary)", lineHeight: 1 }}>OncoTrace-AI</p>
          <p style={{ fontSize: "10px", color: "var(--lb-text-muted)", marginTop: "4px" }}>{patientName || `Sample ${meta.sample_id}`}</p>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_PAGES.map((page) => {
            const active = activePage === page.id;
            return (
              <button key={page.id}
                onClick={() => onNavigate(page.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "var(--lb-radius-md)", marginBottom: "2px",
                  border: "none", borderLeft: `3px solid ${active ? "var(--lb-status-info)" : "transparent"}`,
                  cursor: "pointer", textAlign: "left",
                  background: active ? "var(--lb-status-info-bg)" : "transparent",
                  color: active ? "var(--lb-status-info)" : "var(--lb-text-secondary)",
                  transition: "all 0.2s",
                }}>
                <Icon d={ICONS[page.icon] || ICONS.dna} size={15} style={{ color: active ? "var(--lb-status-info)" : "var(--lb-text-secondary)", flexShrink: 0 }} />
                <span style={{ fontSize: "var(--lb-text-sm)", fontWeight: active ? 700 : 500 }}>{page.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "12px", borderTop: "1px solid var(--lb-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 10px", borderRadius: "var(--lb-radius-sm)", background: "var(--lb-status-low-bg)", border: "1px solid var(--lb-status-low-border)" }}>
            <PulseDot color="var(--lb-status-low)" />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--lb-status-low)" }}>Analysis Complete</span>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }} className="lb-main-area">
        <header className="lb-topbar" style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "var(--lb-bg-surface-raised)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--lb-border)", flexShrink: 0,
        }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 16px" }}>
            <div className="lb-topbar-row" style={{ minHeight: "60px", padding: "10px 0", display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="lb-topbar-title" style={{ flex: 1, minWidth: "120px" }}>
                <p style={{ fontSize: "var(--lb-text-md)", fontWeight: 700, color: "var(--lb-text-primary)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pageTitle}
                </p>
                <p style={{ fontSize: "10px", color: "var(--lb-text-muted)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[patientName, meta.sample_id].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end", minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "5px 10px", borderRadius: "var(--lb-radius-sm)",
                  background: "var(--lb-status-info-bg)", border: "1px solid var(--lb-status-info-border)",
                }} title="This is a research prototype, not a validated clinical diagnostic tool.">
                  <PulseDot color="var(--lb-status-info)" />
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--lb-status-info)" }} className="lb-hide-xs">
                    Research Prototype · Tier 1: {tier1} · Tier 2: {tier2}
                  </span>
                </div>
                {!callerAdapterValidated && (
                  <div
                    title="This file's variant caller adapter has not been validated against a known file from that caller. Field interpretation, including VAF and depth, may be wrong."
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "5px 10px", borderRadius: "var(--lb-radius-sm)",
                      background: "var(--lb-status-high-bg)", border: "1px solid var(--lb-status-high-border)",
                    }}>
                    <Icon d={ICONS.alert} size={11} style={{ color: "var(--lb-status-high)" }} />
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--lb-status-high)" }} className="lb-hide-xs">
                      Unvalidated adapter
                    </span>
                  </div>
                )}
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                {/* Home = secondary navigation, tinted neutral-info so it
                    reads as "leave this view" rather than an analysis action.
                    New Patient = the primary action in this bar, so it takes
                    the solid brand fill. */}
                {onBack && (
                  <button onClick={onBack} title="Back to site" aria-label="Back to site"
                    data-lb-btn="secondary"
                    style={{
                      flexShrink: 0, height: "36px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      padding: "0 14px",
                      borderRadius: "var(--lb-radius-md)", border: "1px solid var(--lb-status-info-border)",
                      background: "var(--lb-status-info-bg)", color: "var(--lb-status-info)",
                      fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}>
                    <Icon d={ICONS.back} size={16} style={{ color: "var(--lb-status-info)" }} />
                    <span className="lb-hide-xs">Home</span>
                  </button>
                )}
                <button onClick={onReset} aria-label="Start a new analysis"
                  data-lb-btn="primary"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    height: "36px", padding: "0 16px",
                    borderRadius: "var(--lb-radius-md)", border: "1px solid transparent",
                    background: "var(--lb-brand)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}>
                  <Icon d={ICONS.upload} size={15} style={{ color: "#fff" }} />
                  <span className="lb-hide-xs">New Patient</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="lb-main-content" style={{ flex: 1, overflowY: "auto", padding: "20px 16px 32px" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {children}
          </div>
        </main>

        {/* Real app-style bottom tab bar, replacing the sidebar entirely
            below 900px. */}
        <nav className="lb-bottom-nav" aria-label="Primary">
          {NAV_PAGES.map((page) => {
            const active = activePage === page.id;
            return (
              <button key={page.id} onClick={() => onNavigate(page.id)}
                aria-current={active ? "page" : undefined}
                style={{
                  flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px",
                  padding: "7px 2px 8px", border: "none", background: "none", cursor: "pointer",
                  color: active ? "var(--lb-status-info)" : "var(--lb-text-muted)",
                }}>
                <Icon d={ICONS[page.icon] || ICONS.dna} size={20} style={{ color: active ? "var(--lb-status-info)" : "var(--lb-text-muted)", flexShrink: 0 }} />
                <span style={{
                  fontSize: "9px", fontWeight: active ? 800 : 600, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                }}>
                  {page.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .lb-sidebar { display: flex !important; }
          .lb-main-area { margin-left: 220px; }
        }
        @media (max-width: 480px) {
          .lb-hide-xs { display: none !important; }
        }
        /* Under 900px the status pills and title can't share one line
           without the heading collapsing to an ellipsis -- give each its
           own row instead of truncating the heading. The bottom nav also
           needs its own reserved space so it never covers page content. */
        @media (max-width: 899px) {
          .lb-topbar-row { flex-wrap: wrap; }
          .lb-topbar-title { flex: 1 1 100%; order: -1; }
          .lb-main-content { padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important; }
        }
        /* On short viewports (landscape phones) the wrapped two-row header
           alone is ~150px -- pinned, it plus the bottom nav would leave
           barely half the screen for content, so let it scroll away. */
        @media (max-height: 500px) {
          .lb-topbar { position: static !important; }
        }
        .lb-bottom-nav {
          display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
          background: var(--lb-bg-surface-raised);
          border-top: 1px solid var(--lb-border);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @media (min-width: 900px) {
          .lb-bottom-nav { display: none !important; }
        }
        [data-lb-theme] ::-webkit-scrollbar { width: 6px; height: 6px; }
        [data-lb-theme] ::-webkit-scrollbar-track { background: transparent; }
        [data-lb-theme] ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 99px; }
        [data-lb-theme] input::placeholder { color: var(--lb-text-muted); }
      `}</style>
    </div>
  );
}
