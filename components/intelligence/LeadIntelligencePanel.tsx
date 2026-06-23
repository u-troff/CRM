"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, Mail, Search, AlertCircle } from "lucide-react";

interface LeadIntelligencePanelProps {
  leadId: string;
  leadName: string;
  ownerName?: string;
}

type PanelStatus = "idle" | "loading" | "done" | "error";

interface IntelligenceReport {
  business_summary: string;
  website_pain_points: string[];
  linkedin_insights: string;
  facebook_insights: string;
  gbp_insights: string;
  cold_call_intro: string;
  cold_email_intro: string;
  scraped_at?: string;
}

const LOADING_MESSAGES = [
  "Scraping website...",
  "Scraping LinkedIn + Facebook...",
  "Searching for Google Business Profile...",
  "Analysing with GPT-4o...",
  "Almost there...",
];

const MAX_POLLS = 60; // 3 min at 3s intervals

export default function LeadIntelligencePanel({ leadId, leadName, ownerName }: LeadIntelligencePanelProps) {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [intel, setIntel] = useState<IntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"call" | "email" | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const startPolling = useCallback(() => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      if (pollCount.current > MAX_POLLS) {
        stopPolling();
        setStatus("error");
        setError("Research timed out — please try again");
        return;
      }
      try {
        const res = await fetch(`/api/intelligence/${leadId}/status`);
        const data = await res.json();
        const found = data.intelligence;
        if (found?.status === "done") {
          stopPolling();
          setIntel(found);
          setStatus("done");
        } else if (found?.status === "error") {
          stopPolling();
          setError(found.error_message ?? "Research failed");
          setStatus("error");
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000);
  }, [leadId, stopPolling]);

  // Initial status check on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/intelligence/${leadId}/status`);
        const data = await res.json();
        const found = data.intelligence;
        if (found?.status === "done") {
          setIntel(found);
          setStatus("done");
        } else if (found?.status === "running") {
          setStatus("loading");
          startPolling();
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
    })();
    return () => stopPolling();
  }, [leadId, startPolling, stopPolling]);

  // Cycle loading messages while researching
  useEffect(() => {
    if (status !== "loading") return;
    setMsgIndex(0);
    const t = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 8000);
    return () => clearInterval(t);
  }, [status]);

  const handleResearch = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/intelligence/${leadId}/trigger`, { method: "POST" });
      if (res.status === 202 || res.status === 409) {
        startPolling();
        return;
      }
      const data = await res.json();
      throw new Error(data.error ?? "Failed to start research");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to start research");
    }
  }, [leadId, startPolling]);

  const handleCopy = useCallback(async (type: "call" | "email", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
        Lead Intelligence
      </div>

      {status === "idle" && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <button className="btn-secondary" onClick={handleResearch} style={{ width: "100%", justifyContent: "center" }}>
            <Search size={13} />
            Research This Lead
          </button>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>
            Scrapes website, LinkedIn, Facebook + GBP — takes ~30 seconds
          </div>
        </div>
      )}

      {status === "loading" && (
        <div style={{ padding: "24px 0", textAlign: "center" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
            Researching {leadName}{ownerName ? ` (${ownerName})` : ""}...
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{LOADING_MESSAGES[msgIndex]}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 12 }}>Usually takes 20–40 seconds</div>
        </div>
      )}

      {status === "error" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-red)", fontSize: 12, marginBottom: 12 }}>
            <AlertCircle size={13} />
            {error}
          </div>
          <button className="btn-secondary" onClick={handleResearch}>Try Again</button>
        </div>
      )}

      {status === "done" && intel && (
        <div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>{intel.business_summary}</div>

          {intel.website_pain_points?.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 16, paddingTop: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Website Pain Points
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {intel.website_pain_points.map((point, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-red)", marginTop: 4, flexShrink: 0 }} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 16, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Presence
            </div>
            {[
              { label: "LinkedIn", value: intel.linkedin_insights },
              { label: "Facebook", value: intel.facebook_insights },
              { label: "Google Profile", value: intel.gbp_insights },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 16, paddingTop: 16 }}>
            <div
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--accent-cyan)",
                borderLeft: "3px solid var(--accent-cyan)",
                padding: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Phone size={12} color="var(--accent-cyan)" />
                <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--accent-cyan)" }}>COLD CALL OPENER</span>
                <button
                  onClick={() => handleCopy("call", intel.cold_call_intro)}
                  style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {copied === "call" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5 }}>{intel.cold_call_intro}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--accent-lime)",
                borderLeft: "3px solid var(--accent-lime)",
                padding: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Mail size={12} color="var(--accent-lime)" />
                <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--accent-lime)" }}>COLD EMAIL / DM OPENER</span>
                <button
                  onClick={() => handleCopy("email", intel.cold_email_intro)}
                  style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {copied === "email" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5 }}>{intel.cold_email_intro}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
              Scraped {intel.scraped_at ? new Date(intel.scraped_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </span>
            <button
              onClick={handleResearch}
              style={{ color: "var(--text-muted)", fontSize: 10, background: "none", border: "none", cursor: "pointer" }}
            >
              Re-run Research
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
