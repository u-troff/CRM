"use client";

import { useState, useCallback } from "react";
import { X, Phone, ExternalLink, Star, ChevronDown, ChevronRight, AlertCircle, Check } from "lucide-react";
import { Lead, CallStatus } from "@/types/lead";
import TierBadge from "@/components/leads/TierBadge";
import StatusPill from "@/components/leads/StatusPill";
import CallHistory from "@/components/dial/CallHistory";
import OutcomeButtons from "@/components/dial/OutcomeButtons";
import LeadIntelligencePanel from "@/components/intelligence/LeadIntelligencePanel";
import { getCallCount } from "@/lib/leads/queries";
import { logCall } from "@/lib/leads/mutations";

interface KanbanLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onLeadUpdated: (updated: Lead) => void;
}

export default function KanbanLeadModal({ lead: initialLead, onClose, onLeadUpdated }: KanbanLeadModalProps) {
  // Track current state locally so call history updates immediately after logging.
  const [lead, setLead] = useState(initialLead);
  const [showNotes, setShowNotes] = useState(true);
  const [callNotes, setCallNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState<CallStatus | null>(null);
  const callCount = getCallCount(lead);

  const handleOutcome = useCallback(
    async (status: CallStatus) => {
      if (logging) return;
      setLogging(true);
      try {
        const updated = await logCall(lead, status, callNotes);
        setLead(updated);
        setCallNotes("");
        setLogged(status);
        onLeadUpdated(updated);
        setTimeout(() => setLogged(null), 2000);
      } finally {
        setLogging(false);
      }
    },
    [lead, callNotes, logging, onLeadUpdated]
  );

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: "flex-start", paddingTop: 40 }}
    >
      <div
        className="modal-container"
        style={{ maxWidth: 960, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <TierBadge tier={lead.tier} />
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lead.businessName}
            </span>
            {lead.ownerName && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
                · {lead.ownerName}
              </span>
            )}
            <StatusPill status={lead.currentStatus} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <a
              href={`/dial/${lead.id}`}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 12, padding: "6px 14px" }}
            >
              <Phone size={13} />
              Open in Dial Mode
            </a>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 0 }}>
          {/* Left column — lead details, outcome logging, call history */}
          <div
            style={{
              padding: 20,
              borderRight: "1px solid var(--border-subtle)",
              overflowY: "auto",
              maxHeight: "calc(90vh - 57px)",
            }}
          >
            {/* Phone */}
            <div style={{ marginBottom: 20 }}>
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="phone-number"
                  style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.04em" }}
                  aria-label={`Call ${lead.businessName}`}
                >
                  {lead.phoneRaw || lead.phone}
                </a>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={16} color="var(--accent-red)" />
                  <span className="phone-missing" style={{ fontSize: 16 }}>
                    {lead.phoneRaw?.startsWith("#") ? "FORMULA ERROR" : "NO PHONE"}
                  </span>
                </div>
              )}
            </div>

            {/* Meta grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 20,
                padding: "12px 0",
                borderTop: "1px solid var(--border-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div className="kpi-label">Rating</div>
                {lead.rating !== null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
                    <Star size={12} color="var(--accent-amber)" fill="var(--accent-amber)" />
                    {lead.rating.toFixed(1)}
                  </div>
                ) : (
                  <span style={{ color: "var(--text-faint)" }}>—</span>
                )}
              </div>
              <div>
                <div className="kpi-label">Reviews</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
                  {lead.reviewCount ?? "—"}
                </div>
              </div>
              <div>
                <div className="kpi-label">Attempts</div>
                <div style={{ color: callCount > 0 ? "var(--accent-amber)" : "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
                  {callCount}
                </div>
              </div>
              <div>
                <div className="kpi-label">Website</div>
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-cyan)", fontSize: 12 }}
                    aria-label="Open website"
                  >
                    <ExternalLink size={12} />
                    Open
                  </a>
                ) : (
                  <span style={{ color: "var(--text-faint)", fontSize: 12 }}>—</span>
                )}
              </div>
            </div>

            {/* Extra fields */}
            {(lead.city || lead.state || lead.email) && (
              <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                {(lead.city || lead.state) && (
                  <div>
                    <div className="kpi-label">Location</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {[lead.city, lead.state].filter(Boolean).join(", ")}
                    </div>
                  </div>
                )}
                {lead.email && (
                  <div>
                    <div className="kpi-label">Email</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: lead.emailQuality === "good" ? "var(--accent-lime)" : "var(--accent-red)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{lead.email}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Website research notes */}
            {lead.websiteNotes && (
              <div style={{ marginBottom: 20 }}>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: 6,
                    fontFamily: "var(--font-mono)",
                  }}
                  onClick={() => setShowNotes((v) => !v)}
                  aria-expanded={showNotes}
                >
                  {showNotes ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  Lead Research Notes
                </button>
                {showNotes && (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {lead.websiteNotes}
                  </div>
                )}
              </div>
            )}

            {/* ── Log Outcome ── */}
            <div
              style={{
                padding: 16,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                marginBottom: 20,
              }}
            >
              <label
                htmlFor="kanban-call-notes"
                style={{
                  display: "block",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  marginBottom: 6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                Call Notes (optional)
              </label>
              <textarea
                id="kanban-call-notes"
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Add notes before logging outcome..."
                rows={2}
                className="form-input"
                style={{ width: "100%", resize: "none", marginBottom: 12 }}
              />

              {logged ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--accent-lime)",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 0",
                  }}
                >
                  <Check size={14} />
                  Outcome logged
                </div>
              ) : (
                <OutcomeButtons onOutcome={handleOutcome} disabled={logging} />
              )}
            </div>

            {/* Call history */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                Call History
              </div>
              <CallHistory lead={lead} />
            </div>
          </div>

          {/* Right column — intelligence */}
          <div
            style={{
              padding: 20,
              overflowY: "auto",
              maxHeight: "calc(90vh - 57px)",
              background: "var(--bg-elevated)",
            }}
          >
            <LeadIntelligencePanel
              leadId={lead.id}
              leadName={lead.businessName}
              ownerName={lead.ownerName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
