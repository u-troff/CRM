"use client";

import { X, Trophy } from "lucide-react";
import { Currency } from "@/types/ads";
import { InboundLead } from "@/types/inbound";
import { ClientRevenueEntry } from "@/types/revenue";
import RevenueEntriesPanel from "./RevenueEntriesPanel";

interface WonRevenuePromptProps {
  lead: InboundLead;
  entries: ClientRevenueEntry[]; // already filtered to this lead
  defaultCurrency: Currency;
  onClose: () => void;
}

// Shown the moment a card lands in Won. Catching the first payment here is the
// whole point — remembering to log it later is how revenue goes untracked.
export default function WonRevenuePrompt({
  lead,
  entries,
  defaultCurrency,
  onClose,
}: WonRevenuePromptProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 720, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}>
            <Trophy size={14} color="var(--accent-lime)" />
            Won — {lead.fullName}
            {lead.businessName && (
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                {lead.businessName}
              </span>
            )}
          </span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
          <RevenueEntriesPanel
            leadId={lead.id}
            entries={entries}
            defaultCurrency={defaultCurrency}
            firstEntryHint
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn-secondary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
