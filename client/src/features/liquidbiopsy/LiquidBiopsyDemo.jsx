import { useState, useCallback, useEffect, useRef } from "react";
import FileUpload from "./File";
import AnalyzingPanel from "./AnalyzingPanel";
import ErrorPanel from "./ErrorPanel";
import Dashboard from "./Dashboard";
import { analyzeVcf } from "./api";
import "./tokens.css";

export default function LiquidBiopsyDemo({ onBack }) {
  const [theme, setTheme] = useState("light");
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [file, setFile] = useState(null);
  const [buildHint, setBuildHint] = useState(undefined);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // "Back to site" unmounts the demo mid-analysis; without this the upload
  // keeps streaming to the server after the user has left the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const runAnalysis = useCallback((selectedFile, referenceBuildHint) => {
    setFile(selectedFile);
    setBuildHint(referenceBuildHint);
    setError(null);
    setStatus("analyzing");

    const controller = new AbortController();
    abortRef.current = controller;

    analyzeVcf(selectedFile, { signal: controller.signal, referenceBuildHint })
      .then((result) => {
        setData(result);
        setStatus("done");
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setError({ kind: err.kind || "annotation_failure", message: err.message });
        setStatus("error");
      });
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRetry = useCallback(() => {
    if (file) runAnalysis(file, buildHint);
  }, [file, buildHint, runAnalysis]);

  const handleStartOver = useCallback(() => {
    setStatus("idle");
    setFile(null);
    setBuildHint(undefined);
    setData(null);
    setError(null);
  }, []);

  return (
    <div data-lb-theme={theme}>
      {status === "idle" && (
        <FileUpload onAnalyze={runAnalysis} theme={theme} toggleTheme={toggleTheme} onBack={onBack} />
      )}
      {status === "analyzing" && (
        <AnalyzingPanel fileName={file?.name} theme={theme} toggleTheme={toggleTheme} onCancel={handleCancel} onBack={onBack} />
      )}
      {status === "error" && (
        <ErrorPanel
          kind={error?.kind}
          message={error?.message}
          theme={theme}
          toggleTheme={toggleTheme}
          onRetry={handleRetry}
          onStartOver={handleStartOver}
          onBack={onBack}
        />
      )}
      {status === "done" && data && (
        <Dashboard data={data} onReset={handleStartOver} onBack={onBack} theme={theme} toggleTheme={toggleTheme} />
      )}
    </div>
  );
}
