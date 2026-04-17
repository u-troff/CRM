"use client";

import { useState, useCallback } from "react";
import { Lead, CallStatus } from "@/types/lead";
import { ExternalLink, Star, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { logCall } from "@/lib/leads/mutations";
import { getCallCount } from "@/lib/leads/queries";
import OutcomeButtons from "./OutcomeButtons";
import CallHistory from "./CallHistory";
import TierBadge from "@/components/leads/TierBadge";
import StatusPill from "@/components/leads/StatusPill";

interface DialCardProps {
  lead: Lead;
  onLeadUpdated: (updated: Lead) => void;
  onOutcome: (updated: Lead) => void;
}

export default function DialCard({ lead, onLeadUpdated, onOutcome }: DialCardProps) {
  const [notes, setNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [animate, setAnimate] = useState(false);

  const handleOutcome = useCallback(
    async (status: CallStatus) => {
      if (logging) return;
      setLogging(true);
      try {
        const updated = await logCall(lead, status, notes);
        setNotes("");
        setAnimate(true);
        setTimeout(() => setAnimate(false), 300);
        onOutcome(updated);
      } finally {
        setLogging(false);
      }
    },
    [lead, notes, logging, onOutcome]
  );

  const callCount = getCallCount(lead);

  return (
    <div className={`dial-card${animate ? " lead-advance" : ""}`}>
      {/* Business name + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
        <TierBadge tier={lead.tier} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {lead.businessName}
            {lead.isFranchise && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 11,
                  color: "var(--text-faint)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 400,
                }}
              >
                [FRANCHISE]
              </span>
            )}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "var(--text-secondary)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {lead.ownerName && <span>{lead.ownerName}</span>}
            {lead.ownerName && lead.city && (
              <span style={{ color: "var(--border-default)" }}>·</span>
            )}
            {lead.city && <span>{lead.city}</span>}
          </div>
        </div>
        <StatusPill status={lead.currentStatus} />
      </div>

      {/* Phone — large, prominent */}
      <div style={{ marginBottom: 20 }}>
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="phone-number"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.04em" }}
            aria-label={`Call ${lead.businessName}`}
          >
            {lead.phoneRaw || lead.phone}
          </a>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} color="var(--accent-red)" />
            <span className="phone-missing" style={{ fontSize: 16 }}>
              {lead.phoneRaw?.startsWith("#") ? "FORMULA ERROR" : "NO PHONE — SKIP"}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              <Star size={12} color="var(--accent-amber)" fill="var(--accent-amber)" />
              {lead.rating.toFixed(1)}
            </div>
          ) : (
            <span style={{ color: "var(--text-faint)" }}>—</span>
          )}
        </div>
        <div>
          <div className="kpi-label">Reviews</div>
          <div
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {lead.reviewCount ?? "—"}
          </div>
        </div>
        <div>
          <div className="kpi-label">Attempts</div>
          <div
            style={{
              color: callCount > 0 ? "var(--accent-amber)" : "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--accent-cyan)",
                fontSize: 12,
              }}
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

      {/* Website notes — collapsible */}
      {lead.websiteNotes && (
        <div style={{ marginBottom: 16 }}>
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

      {/* Live notes textarea */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="call-notes"
          style={{
            display: "block",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Call Notes (this attempt)
        </label>
        <textarea
          id="call-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type while on the call..."
          rows={3}
          className="form-input"
          style={{ width: "100%", resize: "none" }}
        />
      </div>

      {/* Outcome buttons */}
      <OutcomeButtons onOutcome={handleOutcome} disabled={logging} />

      {/* Call history */}
      {lead.history.length > 0 && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
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
            Previous Attempts
          </div>
          <CallHistory lead={lead} />
        </div>
      )}
    </div>
  );
}
