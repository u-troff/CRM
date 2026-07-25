"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { InboundLead, NurtureSequence, NurtureStep } from "@/types/inbound";
import { STAGE_LABELS } from "@/lib/constants/inbound";
import { activityQueryKey } from "@/hooks/useNurture";
import SourceTag from "./SourceTag";
import DetailsTab from "./DetailsTab";
import NurtureTab from "./NurtureTab";
import ActivityTab from "./ActivityTab";

export type DetailTab = "details" | "nurture" | "activity";

interface LeadDetailPanelProps {
  lead: InboundLead;
  sequences: NurtureSequence[];
  steps: NurtureStep[];
  initialTab?: DetailTab;
  onClose: () => void;
  onLeadUpdated: (updated: InboundLead) => void;
}

const TABS: { id: DetailTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "nurture", label: "Nurture" },
  { id: "activity", label: "Activity" },
];

export default function LeadDetailPanel({
  lead,
  sequences,
  steps,
  initialTab = "details",
  onClose,
  onLeadUpdated,
}: LeadDetailPanelProps) {
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const queryClient = useQueryClient();

  const reloadActivity = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: activityQueryKey(lead.id) });
  }, [queryClient, lead.id]);

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Lead details">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                {lead.fullName}
              </span>
              <SourceTag source={lead.source} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              {lead.businessName && (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{lead.businessName}</span>
              )}
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                  padding: "1px 6px",
                }}
              >
                {STAGE_LABELS[lead.stage]}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close panel">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 12px",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--accent-cyan)" : "transparent"}`,
                  color: active ? "var(--accent-cyan)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
                aria-current={active ? "true" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {tab === "details" && <DetailsTab lead={lead} onLeadUpdated={onLeadUpdated} />}
          {tab === "nurture" && (
            <NurtureTab
              lead={lead}
              sequences={sequences}
              steps={steps}
              onLeadUpdated={onLeadUpdated}
              onActivityChanged={reloadActivity}
            />
          )}
          {tab === "activity" && <ActivityTab leadId={lead.id} />}
        </div>
      </div>
    </div>
  );
}
