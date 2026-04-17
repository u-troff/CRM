"use client";

import { useState, useCallback, useRef } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseCsv } from "./CsvParser";
import { parseXlsx } from "./XlsxImporter";
import { rowsToLeads } from "./rowToLead";
import { upsertLeads } from "@/lib/leads/mutations";
import { Lead } from "@/types/lead";

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: (added: number, updated: number) => void;
}

type ImportMode = "append" | "replace";
type StepState = "input" | "preview" | "done";

export default function ImportModal({ onClose, onImportComplete }: ImportModalProps) {
  const [step, setStep] = useState<StepState>("input");
  const [pastedText, setPastedText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      let leads: Lead[];
      const name = file.name.toLowerCase();

      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const rows = await parseXlsx(buffer);
        leads = rowsToLeads(rows, "xlsx_import");
      } else {
        const text = await file.text();
        const rows = parseCsv(text);
        leads = rowsToLeads(rows, "csv_import");
      }

      if (leads.length === 0) {
        setError("No leads found in file. Check that column headers match the expected format.");
        setLoading(false);
        return;
      }

      setParsedLeads(leads);
      setStep("preview");
    } catch (e) {
      setError(`Failed to parse file: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const processText = useCallback(() => {
    if (!pastedText.trim()) return;
    setLoading(true);
    setError(null);
    setTimeout(() => {
      try {
        const rows = parseCsv(pastedText);
        const leads = rowsToLeads(rows, "csv_import");
        if (leads.length === 0) {
          setError("No leads found in pasted text. Check CSV format.");
          setLoading(false);
          return;
        }
        setParsedLeads(leads);
        setStep("preview");
      } catch (e) {
        setError(`Failed to parse CSV: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    }, 10);
  }, [pastedText]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleConfirmImport = useCallback(async () => {
    setLoading(true);
    try {
      if (importMode === "replace") {
        const { storage } = await import("@/lib/storage");
        await storage.clearAll();
      }
      const res = await upsertLeads(parsedLeads);
      setResult(res);
      setStep("done");
      onImportComplete(res.added, res.updated);
    } catch (e) {
      setError(`Import failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [parsedLeads, importMode, onImportComplete]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, width: "100%" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Upload size={16} color="var(--accent-lime)" />
            <span style={{ color: "var(--text-primary)", fontWeight: 600, letterSpacing: "0.05em" }}>
              IMPORT LEADS
            </span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close import modal">
            <X size={16} />
          </button>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div style={{ padding: 24 }}>
            {/* Drop zone */}
            <div
              className={`drop-zone${dragging ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop file or click to select"
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <FileText size={32} color="var(--text-muted)" />
              <div style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: 13 }}>
                Drop <strong>.xlsx</strong>, <strong>.csv</strong>, <strong>.tsv</strong>, or{" "}
                <strong>.xls</strong> here
              </div>
              <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 11 }}>
                or click to select a file
              </div>
            </div>

            {/* Paste CSV */}
            <div style={{ marginTop: 20 }}>
              <label
                htmlFor="paste-csv"
                style={{
                  display: "block",
                  color: "var(--text-muted)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Or paste CSV text
              </label>
              <textarea
                id="paste-csv"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Business Name,City,Phone,Website,Rating,Review Count,Is Franchise,Tier,Notes,Names,Progress"
                rows={5}
                style={{
                  width: "100%",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "10px 12px",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                className="btn-secondary"
                onClick={processText}
                disabled={!pastedText.trim() || loading}
                style={{ marginTop: 8 }}
              >
                Parse CSV Text
              </button>
            </div>

            {error && (
              <div className="error-banner" style={{ marginTop: 16 }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>
                Parsing...
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Found <strong style={{ color: "var(--accent-lime)" }}>{parsedLeads.length}</strong> leads
                — showing first 5
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                  />
                  Append
                </label>
                <label style={{ fontSize: 12, color: "var(--accent-red)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                  />
                  Replace all
                </label>
              </div>
            </div>

            {/* Preview table */}
            <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
              <table className="data-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Tier</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Rating</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedLeads.slice(0, 5).map((lead, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.businessName}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          color: lead.tier === "TIER 1" ? "var(--accent-lime)" : lead.tier === "TIER 2" ? "var(--accent-amber)" : "var(--text-muted)",
                        }}>
                          {lead.tier === "TIER 1" ? "T1" : lead.tier === "TIER 2" ? "T2" : "T3"}
                        </span>
                      </td>
                      <td style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: lead.phone ? "var(--accent-lime)" : "var(--accent-red)",
                      }}>
                        {lead.phone || "MISSING"}
                      </td>
                      <td style={{ fontSize: 11 }}>{lead.city}</td>
                      <td style={{ fontSize: 11 }}>{lead.rating ?? "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{lead.currentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedLeads.length > 5 && (
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>
                + {parsedLeads.length - 5} more leads not shown in preview
              </div>
            )}

            {error && (
              <div className="error-banner" style={{ marginTop: 12 }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {importMode === "replace" && (
              <div className="error-banner" style={{ marginTop: 12, borderColor: "var(--accent-red)" }}>
                <AlertCircle size={14} color="var(--accent-red)" />
                <span style={{ color: "var(--accent-red)" }}>
                  Replace all will permanently delete all existing leads before importing.
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setStep("input")} disabled={loading}>
                Back
              </button>
              <button className="btn-primary" onClick={handleConfirmImport} disabled={loading}>
                {loading ? "Importing..." : `Import ${parsedLeads.length} Leads`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && result && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <CheckCircle2 size={40} color="var(--accent-lime)" style={{ marginBottom: 16 }} />
            <div style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-sans)", marginBottom: 8 }}>
              Import Complete
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              <strong style={{ color: "var(--accent-lime)" }}>{result.added}</strong> added ·{" "}
              <strong style={{ color: "var(--accent-cyan)" }}>{result.updated}</strong> updated
            </div>
            <button className="btn-primary" onClick={onClose} style={{ marginTop: 24 }}>
              View Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
