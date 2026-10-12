import { buildMockAnalysis } from "./mockData";
import { authHeader, clearCredential, encodeCredential } from "./auth/credentialStore";

// Defaults to the REAL backend. Mock mode must be opted into explicitly with
// VITE_LB_USE_MOCK_API=true, because the mock ignores the uploaded file's
// contents entirely and returns one fixed sample -- if that were the default,
// every upload would silently render identical results.
const USE_MOCK = String(import.meta.env.VITE_LB_USE_MOCK_API ?? "false") === "true";
const API_BASE = import.meta.env.VITE_LB_API_BASE_URL || "";

if (USE_MOCK && typeof console !== "undefined") {
  console.warn(
    "[liquidbiopsy] DEMO MODE: the uploaded file is NOT analyzed. Every upload returns the same "
    + "fixed sample dataset. Set VITE_LB_USE_MOCK_API=false to use the real analysis backend."
  );
}

export class AnalysisError extends Error {
  constructor(kind, message, detail) {
    super(message);
    this.name = "AnalysisError";
    this.kind = kind; // "malformed_vcf" | "network" | "annotation_failure" | "timeout" | "unauthorized"
    this.detail = detail;
  }
}

const MOCK_ERROR_MESSAGES = {
  malformed_vcf: "This file couldn't be parsed as a VCF — check that it includes a valid ##fileformat header line.",
  network: "Can't reach the analysis service — it may be temporarily unavailable. Please try again in a moment.",
  annotation_failure: "The file parsed correctly, but the annotation step failed on our side. This isn't something wrong with your file.",
  timeout: "The analysis took too long and timed out. Try again, or try a smaller file.",
  unauthorized: "Your demo session is no longer valid. Please sign in again to continue.",
};

// Mirrors the server's default MAX_UPLOAD_BYTES and nginx's client_max_body_size
// (both 500 MiB), so an oversize file is refused before it is uploaded.
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

const FILE_TOO_LARGE_MESSAGE = "This file is too large to upload (max 500 MB).";

export function validateVcfFile(file) {
  const name = file.name.toLowerCase();
  // .vcf.bgz is the server's other accepted VCF spelling (see readers.py).
  if (!name.endsWith(".vcf") && !name.endsWith(".vcf.gz") && !name.endsWith(".vcf.bgz")) {
    throw new AnalysisError("malformed_vcf", "This doesn't look like a .vcf or .vcf.gz file.");
  }
  if (file.size === 0) {
    throw new AnalysisError("malformed_vcf", "This file is empty — choose a VCF that contains variant calls.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AnalysisError("malformed_vcf", FILE_TOO_LARGE_MESSAGE);
  }
}

// Kinds/messages for error statuses that arrive without the API's JSON body
// (nginx's own 413/429/502/504 pages, or a backend that is down), keyed to the
// ErrorPanel kind whose actions fit: retry for transient failures, start over
// for a file that will never fit.
const STATUS_ERRORS = {
  413: ["malformed_vcf", FILE_TOO_LARGE_MESSAGE],
  429: ["network", "Too many requests right now — please wait a moment and try again."],
  502: ["network", MOCK_ERROR_MESSAGES.network],
  503: ["network", MOCK_ERROR_MESSAGES.network],
  504: ["timeout", MOCK_ERROR_MESSAGES.timeout],
};

// The sign-in call carries no body and should answer in well under a second;
// without a client-side limit a hung request leaves the modal "Verifying…" forever.
const SIGN_IN_TIMEOUT_MS = 20_000;

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

// `forceErrorKind` is a dev-only escape hatch (not exposed in the UI) for
// exercising the four error states without a real backend to trigger them.
async function mockAnalyze(file, { signal, forceErrorKind } = {}) {
  validateVcfFile(file);
  await delay(1400 + Math.random() * 900, signal);
  if (forceErrorKind) {
    throw new AnalysisError(forceErrorKind, MOCK_ERROR_MESSAGES[forceErrorKind] || "Something went wrong.");
  }
  return buildMockAnalysis();
}

async function realAnalyze(file, { signal, referenceBuildHint } = {}) {
  const formData = new FormData();
  formData.append("vcf_file", file);
  if (referenceBuildHint) formData.append("reference_build_hint", referenceBuildHint);

  let response;
  try {
    // No Content-Type header -- fetch must set it itself to include the
    // multipart boundary for FormData.
    response = await fetch(`${API_BASE}/api/v1/vcf/analyze`, {
      method: "POST",
      body: formData,
      headers: authHeader(),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new AnalysisError("network", MOCK_ERROR_MESSAGES.network);
  }

  // Checked ahead of the body, since a rejected credential must drop the stored
  // session and re-prompt rather than be reported as a bad file.
  if (response.status === 401 || response.status === 403) {
    clearCredential();
    throw new AnalysisError("unauthorized", MOCK_ERROR_MESSAGES.unauthorized);
  }

  if (!response.ok) {
    let body = null;
    try { body = await response.json(); } catch { /* non-JSON error body */ }
    const [fallbackKind, fallbackMessage] = STATUS_ERRORS[response.status]
      || [response.status >= 500 ? "annotation_failure" : "malformed_vcf", `Analysis failed (HTTP ${response.status}).`];
    throw new AnalysisError(body?.error_kind || fallbackKind, body?.message || fallbackMessage, body?.detail);
  }

  return response.json();
}

export function analyzeVcf(file, options = {}) {
  return USE_MOCK ? mockAnalyze(file, options) : realAnalyze(file, options);
}

/** Checks credentials against the server before they are stored, so a wrong
 *  password is reported at sign-in rather than surfacing later as a failed
 *  upload. Resolves to the encoded credential on success, null if rejected. */
export async function verifyCredentials(username, password) {
  const encoded = encodeCredential(username, password);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIGN_IN_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/auth/verify`, {
      method: "POST",
      headers: { Authorization: `Basic ${encoded}` },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AnalysisError("timeout", "The sign-in service took too long to respond. Please try again.");
    }
    throw new AnalysisError("network", "Can't reach the sign-in service. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (response.ok) return encoded;
  if (response.status === 401 || response.status === 403) return null;

  // nginx rate-limits this endpoint (limit_req_status 429).
  if (response.status === 429) {
    throw new AnalysisError("network", "Too many sign-in attempts. Please wait a minute and try again.");
  }

  if (response.status === 503) {
    throw new AnalysisError(
      "network",
      "The demo sign-in isn't configured on the server yet. Please contact the team.",
    );
  }
  throw new AnalysisError("network", `Sign-in failed (HTTP ${response.status}). Please try again.`);
}

export const isMockMode = USE_MOCK;
