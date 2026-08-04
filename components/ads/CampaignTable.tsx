"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { AdCampaign, AdSpendEntry } from "@/types/ads";
import { formatMoney, formatPeriodDate } from "@/lib/ads/format";

interface CampaignTableProps {
  campaigns: AdCampaign[];
  entries: AdSpendEntry[];
  leadCounts: Record<string, number>; // campaign id → attributed leads
  onEdit: (campaign: AdCampaign) => void;
  onManageSpend: (campaign: AdCampaign) => void;
  onDelete: (id: string) => void;
}

interface SpendSummary {
  total: number;
  entryCount: number;
  lastPeriodEnd: string | null;
  mixedCurrency: boolean;
}

function summarise(entries: AdSpendEntry[], campaign: AdCampaign): SpendSummary {
  const mine = entries.filter((e) => e.campaignId === campaign.id);
  return {
    total: mine.reduce((sum, e) => sum + e.amountSpent, 0),
    entryCount: mine.length,
    lastPeriodEnd: mine.reduce<string | null>(
      (latest, e) => (latest === null || e.periodEnd > latest ? e.periodEnd : latest),
      null
    ),
    // Summing a campaign's entries assumes they share a currency — there is no
    // exchange rate in this app, so a mismatch is flagged instead of converted.
    mixedCurrency: mine.some((e) => e.currency !== campaign.currency),
  };
}

export default function CampaignTable({
  campaigns,
  entries,
  leadCounts,
  onEdit,
  onManageSpend,
  onDelete,
}: CampaignTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const summaries = useMemo(() => {
    const map: Record<string, SpendSummary> = {};
    for (const c of campaigns) map[c.id] = summarise(entries, c);
    return map;
  }, [campaigns, entries]);

  if (campaigns.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No campaigns yet</div>
        <div className="empty-state-subtitle">
          Add the campaigns you're running, then log what each one spends per week.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
      <table className="data-table" style={{ tableLayout: "fixed", minWidth: 940 }}>
        <thead>
          <tr>
            <th style={{ width: 250 }}>Campaign</th>
            <th style={{ width: 100 }}>Platform</th>
            <th style={{ width: 170 }}>Vertical</th>
            <th style={{ width: 70 }}>Market</th>
            <th style={{ width: 130, textAlign: "right" }}>Spend</th>
            <th style={{ width: 90, textAlign: "right" }}>Leads</th>
            <th style={{ width: 110 }}>Last Period</th>
            <th style={{ width: 120, textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const summary = summaries[campaign.id];
            return (
              <tr key={campaign.id}>
                <td style={{ color: "var(--text-primary)", fontWeight: 500, fontFamily: "var(--font-sans)" }}>
                  {campaign.name}
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 400 }}>
                    {summary.entryCount} spend {summary.entryCount === 1 ? "entry" : "entries"}
                    {summary.mixedCurrency && (
                      <span style={{ color: "var(--accent-amber)" }}> · mixed currencies</span>
                    )}
                  </div>
                </td>
                <td>{campaign.platform}</td>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {campaign.vertical ?? "—"}
                </td>
                <td>{campaign.market ?? "—"}</td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-primary)" }}>
                  {formatMoney(summary.total, campaign.currency)}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {leadCounts[campaign.id] ?? 0}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {summary.lastPeriodEnd ? formatPeriodDate(summary.lastPeriodEnd) : "—"}
                </td>
                <td style={{ textAlign: "center", overflow: "visible" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button
                      className="icon-btn"
                      aria-label={`Log spend for ${campaign.name}`}
                      title="Log spend"
                      onClick={() => onManageSpend(campaign)}
                    >
                      <Wallet size={13} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${campaign.name}`}
                      onClick={() => onEdit(campaign)}
                    >
                      <Pencil size={13} />
                    </button>
                    {confirmDeleteId === campaign.id ? (
                      <button
                        className="btn-danger"
                        style={{ padding: "2px 6px", fontSize: 10 }}
                        onClick={() => {
                          setConfirmDeleteId(null);
                          onDelete(campaign.id);
                        }}
                        onBlur={() => setConfirmDeleteId(null)}
                        autoFocus
                      >
                        Sure?
                      </button>
                    ) : (
                      <button
                        className="icon-btn"
                        aria-label={`Delete ${campaign.name}`}
                        title="Deleting also deletes this campaign's spend entries"
                        onClick={() => setConfirmDeleteId(campaign.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
