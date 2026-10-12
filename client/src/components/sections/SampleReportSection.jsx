import { useEffect, useMemo } from "react";
import DoctorSummaryPage from "../../features/liquidbiopsy/pages/DoctorSummaryPage";
import { buildMockAnalysis } from "../../features/liquidbiopsy/mockData";
import "../../features/liquidbiopsy/tokens.css";
import { markHomeLayoutReady } from "../../lib/layout";

// A static, always-light-theme rendering of the Doctor Summary report --
// the same page shown inside the full dashboard after a real VCF is
// analyzed (Dashboard.jsx -> DoctorSummaryPage), but embedded directly into
// the marketing home page as a single continuous scroll, with no sidebar or
// tab navigation, so a visitor can see exactly what a report looks like
// without uploading a file.
export default function SampleReportSection() {
  const data = useMemo(() => buildMockAnalysis(), []);

  // This section is lazy-loaded and variable-height; once it has committed,
  // everything below it is at its final position and section scrolls may run.
  useEffect(() => {
    markHomeLayoutReady();
  }, []);

  return (
    <section
      id="sample-report"
      className="relative w-full"
      aria-label="Sample Report"
      style={{ background: "#f8fafc" }}
    >
      <div className="max-w-[1150px] mx-auto px-3 sm:px-4 lg:px-6 pt-10 sm:pt-12 lg:pt-16 pb-14 sm:pb-18 lg:pb-24">
        <div className="text-center mb-10 sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 sm:text-sm">
            See It In Action
          </p>
          <h2
            className="font-bold leading-tight tracking-tight text-slate-900"
            style={{ fontSize: "clamp(1.8rem, 4.5vw, 3rem)", letterSpacing: "-0.025em" }}
          >
            A Sample{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Variant Report
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 sm:text-base">
            This is the exact structured report our pipeline generates once a VCF finishes processing.
          </p>
        </div>

        <div
          data-lb-theme="light"
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:p-5 lg:p-7"
        >
          <DoctorSummaryPage data={data} theme="light" hideDisclaimers />
        </div>
      </div>
    </section>
  );
}
