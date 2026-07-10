"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Download, RotateCcw } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import AllLeadsTable from "@/components/enrich/AllLeadsTable";

type Niche = "flooring" | "remodeling" | "plumbing";
type PageState = "idle" | "uploading" | "processing" | "complete";

interface StatusResponse {
  status: "pending" | "processing" | "complete" | "failed";
  total_leads: number;
  processed_leads: number;
  percentage: number;
  done_count: number;
  failed_count: number;
}

export default function EnrichPage() {
  const [state, setState] = useState<PageState>("idle");
  const [niche, setNiche] = useState<Niche | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollStatus = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/enrich/status?job_id=${id}`);
        // Job no longer exists (deleted) — stop polling instead of looping forever.
        if (res.status === 404) {
          if (pollRef.current) clearInterval(pollRef.current);
          localStorage.removeItem("enrichment_job_id");
          localStorage.removeItem("enrichment_job_status");
          setState("idle");
          return;
        }
        const data: StatusResponse = await res.json();
        setStatusData(data);
        if (data.status === "complete" || data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          localStorage.setItem("enrichment_job_status", "complete");
          setState("complete");
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }, []);

  // Resume a job that was still running (or had just finished) before a
  // page reload, so refreshing mid-enrichment doesn't lose the user's place.
  useEffect(() => {
    const savedJobId = localStorage.getItem("enrichment_job_id");
    const savedStatus = localStorage.getItem("enrichment_job_status");

    if (savedJobId && savedStatus === "processing") {
      setJobId(savedJobId);
      setState("processing");
      fetch(`/api/enrich/status?job_id=${savedJobId}`)
        .then((res) => res.json())
        .then((data: StatusResponse) => setStatusData(data))
        .catch(() => {});
      pollStatus(savedJobId);
    } else if (savedJobId && savedStatus === "complete") {
      setJobId(savedJobId);
      setState("complete");
      fetch(`/api/enrich/status?job_id=${savedJobId}`)
        .then((res) => res.json())
        .then((data: StatusResponse) => setStatusData(data))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(async () => {
    if (!niche || !file) return;
    setState("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("niche", niche);
      const res = await fetch("/api/enrich/start", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start enrichment");
        setState("idle");
        return;
      }
      localStorage.setItem("enrichment_job_id", data.job_id);
      localStorage.setItem("enrichment_job_status", "processing");
      setJobId(data.job_id);
      setState("processing");
      pollStatus(data.job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start enrichment");
      setState("idle");
    }
  }, [niche, file, pollStatus]);

  const handleReset = useCallback(() => {
    localStorage.removeItem("enrichment_job_id");
    localStorage.removeItem("enrichment_job_status");
    setState("idle");
    setNiche(null);
    setFile(null);
    setJobId(null);
    setStatusData(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  return (
    <>
      <TopBar title="Lead Enrichment" />
      <div className="page-content">
        <div style={{ maxWidth: 560 }}>
          {state === "idle" && (
            <>
              <div style={{ marginBottom: 24, color: "var(--text-muted)", fontSize: 13 }}>
                Personalizes subject lines and intros by scraping each lead&apos;s website
              </div>

              <div
                style={{
                  marginBottom: 8,
                  color: "var(--text-muted)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Niche
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {(["flooring", "remodeling", "plumbing"] as const).map((n) => (
                  <button
                    key={n}
                    className="btn-secondary"
                    style={
                      niche === n
                        ? { borderColor: "var(--accent-lime)", color: "var(--accent-lime)" }
                        : undefined
                    }
                    onClick={() => setNiche(n)}
                  >
                    {n === "flooring" ? "Flooring" : n === "remodeling" ? "Remodeling" : "Plumbing"}
                  </button>
                ))}
              </div>

              <div
                className={`drop-zone${dragging ? " drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Drop CSV or click to select"
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <FileText size={32} color="var(--text-muted)" />
                {file ? (
                  <div style={{ marginTop: 12, color: "var(--accent-lime)", fontSize: 13 }}>
                    {file.name}
                  </div>
                ) : (
                  <>
                    <div style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: 13 }}>
                      Drop <strong>.csv</strong> here
                    </div>
                    <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 11 }}>
                      or click to select a file
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="error-banner" style={{ marginTop: 16 }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                className="btn-primary"
                style={{ marginTop: 20 }}
                disabled={!niche || !file}
                onClick={handleStart}
              >
                <Upload size={14} />
                Start Enrichment
              </button>
            </>
          )}

          {state === "uploading" && (
            <div className="empty-state">
              <div className="led-dot" />
              <div className="empty-state-title">Uploading and parsing CSV...</div>
            </div>
          )}

          {state === "processing" && statusData && (
            <div style={{ paddingTop: 40 }}>
              <div style={{ marginBottom: 12, color: "var(--text-primary)", fontSize: 14 }}>
                Enriching leads — {statusData.processed_leads} / {statusData.total_leads} (
                {statusData.percentage}%)
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${statusData.percentage}%`, color: "var(--accent-lime)" }}
                />
              </div>
              <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 11 }}>
                ✓ Done: {statusData.done_count}   ✗ Failed: {statusData.failed_count}
              </div>
            </div>
          )}

          {state === "processing" && !statusData && (
            <div className="empty-state">
              <div className="led-dot" />
              <div className="empty-state-title">Starting enrichment...</div>
            </div>
          )}

          {state === "complete" && statusData && jobId && statusData.status === "failed" && (
            <div className="empty-state">
              <AlertCircle size={40} color="var(--accent-red)" />
              <div className="empty-state-title">Enrichment job failed</div>
              <div className="empty-state-subtitle">
                {statusData.done_count} leads still completed successfully before the failure.
              </div>
              {statusData.done_count > 0 && (
                <a
                  href={`/api/enrich/download?job_id=${jobId}`}
                  className="btn-secondary"
                  style={{ marginTop: 4 }}
                >
                  <Download size={14} />
                  Download Partial CSV
                </a>
              )}
              <button className="btn-primary" onClick={handleReset} style={{ marginTop: 12 }}>
                <RotateCcw size={14} />
                Try Again
              </button>
            </div>
          )}

          {state === "complete" && statusData && jobId && statusData.status !== "failed" && (
            <div className="empty-state">
              <CheckCircle2 size={40} color="var(--accent-lime)" />
              <div className="empty-state-title">Enrichment complete</div>
              <div className="empty-state-subtitle">
                {statusData.done_count} leads ready to download
                {statusData.failed_count > 0 && (
                  <>
                    <br />
                    ({statusData.failed_count} leads failed — no website or scrape error, excluded
                    from CSV)
                  </>
                )}
              </div>
              <a
                href={`/api/enrich/download?job_id=${jobId}`}
                className="btn-primary"
                style={{ marginTop: 12 }}
              >
                <Download size={14} />
                Download Enriched CSV
              </a>
              <button className="btn-secondary" onClick={handleReset} style={{ marginTop: 4 }}>
                <RotateCcw size={14} />
                Enrich Another List
              </button>
            </div>
          )}
        </div>

        <AllLeadsTable />
      </div>
    </>
  );
}
