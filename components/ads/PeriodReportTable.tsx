"use client";

import { CampaignPeriodReport } from "@/types/ads";
import { revenueComparable } from "@/lib/ads/queries";
import {
  formatCostPer,
  formatMoney,
  formatPeriod,
  formatRate,
  formatRoas,
  roasColor,
} from "@/lib/ads/format";

interface PeriodReportTableProps {
  periods: CampaignPeriodReport[];
}

export default function PeriodReportTable({ periods }: PeriodReportTableProps) {
  if (periods.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No spend periods logged</div>
        <div className="empty-state-subtitle">
          Log a week of spend against a campaign to see it broken down here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
      <table className="data-table" style={{ tableLayout: "fixed", minWidth: 1180 }}>
        <thead>
          <tr>
            <th style={{ width: 200 }}>Campaign</th>
            <th style={{ width: 150 }}>Period</th>
            <th style={{ width: 110, textAlign: "right" }}>Spend</th>
            <th style={{ width: 70, textAlign: "right" }}>Leads</th>
            <th style={{ width: 80, textAlign: "right" }}>Qualified</th>
            <th style={{ width: 70, textAlign: "right" }}>Qual %</th>
            <th style={{ width: 70, textAlign: "right" }}>Booked</th>
            <th style={{ width: 60, textAlign: "right" }}>Won</th>
            <th style={{ width: 110, textAlign: "right" }}>Cost / Lead</th>
            <th style={{ width: 120, textAlign: "right" }}>Cost / Qual</th>
            <th style={{ width: 110, textAlign: "right" }}>Cost / Win</th>
            <th style={{ width: 120, textAlign: "right" }}>Collected</th>
            <th style={{ width: 80, textAlign: "right" }}>ROAS</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((row) => {
            const roasOk = revenueComparable(row);
            return (
            <tr key={row.spendEntryId}>
              <td
                style={{ color: "var(--text-primary)", fontWeight: 500, fontFamily: "var(--font-sans)" }}
                title={row.notes ?? undefined}
              >
                {row.campaignName}
                <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 400 }}>
                  {[row.platform, row.vertical, row.market].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {formatPeriod(row.periodStart, row.periodEnd)}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-primary)" }}>
                {formatMoney(row.amountSpent, row.currency)}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>{row.totalLeads}</td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--accent-lime)" }}>
                {row.qualifiedLeads}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                {formatRate(row.qualifiedRate)}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--accent-emerald)" }}>
                {row.bookedCount}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--accent-lime)" }}>
                {row.wonCount}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                {formatCostPer(row.costPerLead, row.currency)}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                {formatCostPer(row.costPerQualifiedLead, row.currency)}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-primary)" }}>
                {formatCostPer(row.costPerWin, row.currency)}
              </td>
              <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--accent-lime)" }}>
                {formatMoney(
                  row.revenueCollected,
                  row.revenueCurrencies[0] ?? row.currency
                )}
              </td>
              <td
                style={{
                  fontFamily: "var(--font-mono)",
                  textAlign: "right",
                  fontWeight: 600,
                  color: roasOk ? roasColor(row.roas) : "var(--text-muted)",
                }}
                title={
                  roasOk
                    ? undefined
                    : "Revenue for this period was logged in another currency, so ROAS can't be derived."
                }
              >
                {roasOk ? formatRoas(row.roas) : "—"}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
