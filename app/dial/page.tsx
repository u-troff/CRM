"use client";

import { useEffect, useState, useCallback } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useDialSession } from "@/hooks/useDialSession";
import { Lead, CallStatus } from "@/types/lead";
import { DIAL_OUTCOME_STATUSES, STATUS_META } from "@/lib/constants/statuses";
import TopBar from "@/components/layout/TopBar";
import DialCard from "@/components/dial/DialCard";
import ScriptPanel from "@/components/dial/ScriptPanel";
import DialQueueNav from "@/components/dial/DialQueueNav";
import { Phone, HelpCircle, X } from "lucide-react";

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const outcomeShortcuts = DIAL_OUTCOME_STATUSES.filter(
    (s) => STATUS_META[s].shortcut !== undefined
  );

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: 13,
            }}
          >
            Keyboard Shortcuts
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close help">
            <X size={16} />
          </button>
        </div>

        <div className="help-row">
          <span style={{ color: "var(--text-secondary)" }}>Previous lead</span>
          <span className="help-key">←</span>
        </div>
        <div className="help-row">
          <span style={{ color: "var(--text-secondary)" }}>Next lead</span>
          <span className="help-key">→</span>
        </div>
        <div
          style={{
            margin: "12px 0 4px",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-faint)",
          }}
        >
          Outcome Shortcuts
        </div>
        {outcomeShortcuts.map((s) => (
          <div className="help-row" key={s}>
            <span style={{ color: STATUS_META[s].color, fontSize: 12 }}>
              {STATUS_META[s].label}
            </span>
            <span className="help-key">{STATUS_META[s].shortcut}</span>
          </div>
        ))}
        <div className="help-row">
          <span style={{ color: "var(--text-secondary)" }}>Toggle this help</span>
          <span className="help-key">?</span>
        </div>
      </div>
    </div>
  );
}

export default function DialPage() {
  const { leads, reload, loading, error } = useLeads();
  const session = useDialSession(leads);
  const [showHelp, setShowHelp] = useState(false);

  // Mirror current lead from session; update as leads reload
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  useEffect(() => {
    setActiveLead(session.currentLead);
  }, [session.currentLead]);

  const handleLeadUpdated = useCallback(
    (updated: Lead) => {
      setActiveLead(updated);
    },
    []
  );

  const handleOutcome = useCallback(
    async (updated: Lead) => {
      setActiveLead(updated);
      await reload();
      // Advance after reload
      session.goToNext();
    },
    [reload, session]
  );

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        session.goToPrev();
      } else if (e.key === "ArrowRight") {
        session.goToNext();
      } else if (e.key === "?") {
        setShowHelp((v) => !v);
      } else if (e.key === "Escape") {
        setShowHelp(false);
      } else {
        // Number shortcuts for outcome buttons
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          const status = DIAL_OUTCOME_STATUSES.find(
            (s) => STATUS_META[s].shortcut === num
          );
          if (status && activeLead) {
            // Programmatically click the outcome button
            const btn = document.getElementById(`outcome-btn-${status}`);
            if (btn) btn.click();
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session, activeLead]);

  return (
    <>
      <TopBar title="Dial Mode">
        <button
          className="icon-btn"
          onClick={() => setShowHelp(true)}
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle size={16} />
        </button>
      </TopBar>

      <div className="page-content" style={{ overflow: "hidden", padding: "16px 20px" }}>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div className="loading-skeleton-table">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="loading-skeleton-row" />
            ))}
          </div>
        ) : session.total === 0 ? (
          <div className="empty-state">
            <Phone size={40} color="var(--text-faint)" />
            <div className="empty-state-title">Queue Empty</div>
            <div className="empty-state-subtitle">
              No leads in the dial queue. The queue includes TIER 1–3 leads with valid phone
              numbers, excluding DNC, Wrong Number, Closed Won/Lost, and Not Interested.
              <br />
              Import more leads or update statuses in the Pipeline.
            </div>
          </div>
        ) : !activeLead ? (
          <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading...</div>
        ) : (
          <div className="dial-layout">
            {/* Main panel */}
            <div className="dial-main">
              <DialQueueNav
                currentIndex={session.currentIndex}
                total={session.total}
                tier={activeLead.tier}
                hasPrev={session.hasPrev}
                hasNext={session.hasNext}
                onPrev={session.goToPrev}
                onNext={session.goToNext}
              />
              <DialCard
                key={activeLead.id}
                lead={activeLead}
                onLeadUpdated={handleLeadUpdated}
                onOutcome={handleOutcome}
              />
            </div>

            {/* Right panel — script */}
            <div className="dial-sidebar">
              <ScriptPanel />
            </div>
          </div>
        )}
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </>
  );
}
