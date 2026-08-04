"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { InboundLead } from "@/types/inbound";
import { useInboundLeads } from "@/hooks/useInboundLeads";
import { useNurture } from "@/hooks/useNurture";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { useInvalidateCampaignReport } from "@/hooks/useCampaignReport";
import { isFollowupDue, isFollowupOverdue, formatFollowupDate } from "@/lib/inbound/date";
import { STAGE_LABELS } from "@/lib/constants/inbound";
import TopBar from "@/components/layout/TopBar";
import SourceTag from "@/components/inbound/SourceTag";
import LeadDetailPanel from "@/components/inbound/LeadDetailPanel";

export default function FollowUpsPage() {
  const { leads, loading, error, patchLead } = useInboundLeads();
  const { sequences, steps } = useNurture();
  const { campaigns } = useAdCampaigns();
  const invalidateReport = useInvalidateCampaignReport();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const due = useMemo(
    () =>
      leads
        .filter((l) => isFollowupDue(l.nextFollowupAt))
        .sort(
          (a, b) =>
            new Date(a.nextFollowupAt!).getTime() - new Date(b.nextFollowupAt!).getTime()
        ),
    [leads]
  );

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <>
      <TopBar title="Follow-ups">
        <Link href="/inbound" className="btn-secondary" style={{ textDecoration: "none" }}>
          <ArrowLeft size={13} />
          Board
        </Link>
      </TopBar>

      <div className="page-content">
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
          Every lead due today or overdue, oldest first. Click a row to work it.
        </p>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
        ) : due.length === 0 ? (
          <div className="empty-state">
            <CalendarClock size={28} color="var(--text-faint)" />
            <div className="empty-state-title">All caught up</div>
            <div className="empty-state-subtitle">No follow-ups are due right now.</div>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border-subtle)", maxWidth: 900 }}>
            {due.map((lead: InboundLead) => {
              const overdue = isFollowupOverdue(lead.nextFollowupAt);
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--accent-cyan)",
                      width: 90,
                      flexShrink: 0,
                    }}
                  >
                    <CalendarClock size={12} />
                    {overdue ? "Overdue" : formatFollowupDate(lead.nextFollowupAt)}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {lead.fullName}
                      </span>
                      <SourceTag source={lead.source} />
                    </span>
                    {lead.businessName && (
                      <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {lead.businessName}
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>
                    {lead.phone ?? "—"}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-default)",
                      padding: "1px 6px",
                      flexShrink: 0,
                    }}
                  >
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          sequences={sequences}
          steps={steps}
          campaigns={campaigns}
          initialTab="nurture"
          onClose={() => setSelectedId(null)}
          onLeadUpdated={(updated) => {
            patchLead(updated);
            invalidateReport();
          }}
        />
      )}
    </>
  );
}
