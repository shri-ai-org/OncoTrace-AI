// Data-only module so this copy can be reviewed/edited without touching layout
// code (mirrors how nav.js/colors.js already separate data from markup here).
//
// Sections marked NEW below are newly written for this feature and have not
// been through a legal review; everything else quotes language already
// displayed elsewhere in this app (see file comments at each call site). No
// section makes an unverified compliance claim (HIPAA, GDPR, ISO, SOC2,
// "anonymous", "guaranteed deletion", etc.) -- only what's already true of
// how this app is described elsewhere.
export const TERMS_SECTIONS = [
  {
    id: "purpose",
    title: "What this is",
    body:
      "This tool is for research and pilot review only. It is not intended for clinical diagnosis and is not a " +
      "substitute for clinical-grade testing technologies or a licensed clinician's judgment. Any summary, tier, " +
      "or association shown after analysis must be discussed with a treating physician or genetic counselor " +
      "before any decision is based on it.",
  },
  {
    id: "handling",
    title: "How your file is handled",
    body:
      "Your file is processed by our own self-hosted analysis service -- it is not sent to any third-party API. " +
      "It is not persisted after analysis completes, and the connection is encrypted in transit. This is not a " +
      "substitute for a formal compliance certification (e.g. HIPAA, SOC 2, ISO), and none is claimed here.",
  },
  {
    id: "responsibilities",
    title: "Your responsibilities",
    // NEW COPY -- recommended for legal review before production use with real patient data.
    body:
      "Only upload a file you are authorized to submit. Do not include patient-identifying information beyond " +
      "what may already appear in the filename itself -- this tool has no dedicated identity field and does not " +
      "ask for one. You are responsible for ensuring appropriate consent or authorization exists for any data " +
      "you upload.",
  },
  {
    id: "availability",
    title: "Availability",
    // NEW COPY -- recommended for legal review before production use with real patient data.
    body:
      "This is a research/pilot tool, not a production diagnostic service with an availability guarantee. " +
      "Analysis may fail or be temporarily unavailable; retry or contact us if that happens.",
  },
];
