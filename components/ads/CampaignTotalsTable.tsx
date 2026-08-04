"use client";

import { CampaignTotals } from "@/types/ads";
import { hasMixedCurrencies, revenueComparable } from "@/lib/ads/queries";
import {
  formatCostPer,
  formatMoney,
  formatRate,
  formatRoas,
  roasColor,
} from "@/lib/ads/format";

interface CampaignTotalsTableProps {
  totals: CampaignTotals[];
}

const MIXED_TITLE =
  "Spend for this campaign was logged in more than one currency, so cost-per figures can't be derived — fix the entries or split the campaign.";

const MIXED_REVENUE_TITLE =
  "This client paid in a currency the ads weren't bought in, so return on ad spend can't be derived.";

export default function CampaignTotalsTable({ totals }: CampaignTotalsTableProps) {
  if (totals.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Nothing to report yet</div>
        <div className="empty-state-subtitle">
          Add a campaign, log its spend, and point some inbound leads at it.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)" }}>
      <table className="data-table" style={{ tableLayout: "fixed", minWidth: 1180 }}>
        <thead>
          <tr>
            <th style={{ width: 210 }}>Campaign</th>
            <th style={{ width: 120, textAlign: "right" }}>Spend</th>
            <th style={{ width: 70, textAlign: "right" }}>Leads</th>
            <th style={{ width: 80, textAlign: "right" }}>Qualified</th>
            <th style={{ width: 70, textAlign: "right" }}>Qual %</th>
            <th style={{ width: 70, textAlign: "right" }}>Booked</th>
            <th style={{ width: 60, textAlign: "right" }}>Won</th>
            <th style={{ width: 110, textAlign: "right" }}>Cost / Lead</th>
            <th style={{ width: 120, textAlign: "right" }}>Cost / Qual</th>
            <th style={{ width: 120, textAlign: "right" }}>Cost / Booking</th>
            <th style={{ width: 110, textAlign: "right" }}>Cost / Win</th>
            <th style={{ width: 120, textAlign: "right" }}>Collected</th>
            <th style={{ width: 120, textAlign: "right" }}>Outstanding</th>
            <th style={{ width: 80, textAlign: "right" }}>ROAS</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((row) => {
            // A campaign whose entries mix currencies has a spend total that
            // adds unlike amounts, so every figure derived from it is withheld
            // rather than quietly wrong.
            const mixed = hasMixedCurrencies(row);
            const cost = (value: number | null) =>
              mixed ? "—" : formatCostPer(value, row.currency);
            // Revenue in another currency can be shown but not divided by spend.
            const roasOk = !mixed && revenueComparable(row);

            return (
              <tr
                key={row.campaignId}
                title={
                  mixed
                    ? MIXED_TITLE
                    : roasOk
                      ? undefined
                      : MIXED_REVENUE_TITLE
                }
              >
                <td style={{ color: "var(--text-primary)", fontWeight: 500, fontFamily: "var(--font-sans)" }}>
                  {row.campaignName}
                  <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 400 }}>
                    {[row.platform, row.vertical, row.market].filter(Boolean).join(" · ")}
                    {mixed && (
                      <span style={{ color: "var(--accent-amber)" }}> · mixed currencies</span>
                    )}
                  </div>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-primary)" }}>
                  {formatMoney(row.totalSpend, row.currency)}
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
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>{cost(row.costPerLead)}</td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {cost(row.costPerQualifiedLead)}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {cost(row.costPerBooking)}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-primary)" }}>
                  {cost(row.costPerWin)}
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
                    color:
                      row.revenueOutstanding > 0
                        ? "var(--accent-amber)"
                        : "var(--text-muted)",
                  }}
                >
                  {formatMoney(
                    row.revenueOutstanding,
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
