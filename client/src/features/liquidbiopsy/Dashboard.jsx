import { useState } from "react";
import DashboardShell from "./layout/DashboardShell";
import DoctorSummaryPage from "./pages/DoctorSummaryPage";
import VariantsPage from "./pages/VariantsPage";
import VafRiskPage from "./pages/VafRiskPage";
import ResistancePage from "./pages/ResistancePage";
import TechnicalPage from "./pages/TechnicalPage";

const PAGES = {
  doctor: DoctorSummaryPage,
  variants: VariantsPage,
  vaf: VafRiskPage,
  resistance: ResistancePage,
  technical: TechnicalPage,
};

export default function Dashboard({ data, onReset, onBack, theme, toggleTheme }) {
  const [activePage, setActivePage] = useState("doctor");

  const PageComponent = PAGES[activePage] || DoctorSummaryPage;

  return (
    <DashboardShell
      activePage={activePage}
      onNavigate={setActivePage}
      meta={data.meta}
      tierSummary={data.tier_summary}
      callerAdapterValidated={data.meta?.caller_adapter_validated !== false}
      theme={theme}
      toggleTheme={toggleTheme}
      onReset={onReset}
      onBack={onBack}
    >
      <PageComponent data={data} theme={theme} />
    </DashboardShell>
  );
}
