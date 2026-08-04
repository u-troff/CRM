"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCampaignReport } from "@/hooks/useCampaignReport";
import { summariseTotals } from "@/lib/ads/summary";
import {
  formatCostPer,
  formatMoney,
  formatRate,
  formatRoas,
  roasColor,
} from "@/lib/ads/format";
import TopBar from "@/components/layout/TopBar";
import KpiCard from "@/components/analytics/KpiCard";
import CampaignTotalsTable from "@/components/ads/CampaignTotalsTable";
import PeriodReportTable from "@/components/ads/PeriodReportTable";

const sectionLabel = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
  fontWeight: 600,
  marginBottom: 12,
};

export default function CampaignReportPage() {
  const { totals, periods, loading, error } = useCampaignReport();
  const [campaignId, setCampaignId] = useState<string | "all">("all");

  const shownTotals = useMemo(
    () => (campaignId === "all" ? totals : totals.filter((t) => t.campaignId === campaignId)),
    [totals, campaignId]
  );

  const shownPeriods = useMemo(
    () => (campaignId === "all" ? periods : periods.filter((p) => p.campaignId === campaignId)),
    [periods, campaignId]
  );

  const summary = useMemo(() => summariseTotals(shownTotals), [shownTotals]);

  // Cost-per-X across campaigns only means something when they're all billed in
  // the same currency; otherwise the cards show an em dash and the per-campaign
  // table below still carries the real numbers.
  const cost = (value: number | null) =>
    summary.singleCurrency ? formatCostPer(value, summary.singleCurrency) : "—";

  // Revenue totals are only summable under the same rule as spend.
  const money = (value: number) =>
    summary.singleCurrency ? formatMoney(value, summary.singleCurrency) : "—";

  const spendLabel =
    summary.spendByCurrency.length === 0
      ? formatMoney(0, "ZAR")
      : summary.spendByCurrency
          .map(({ currency, amount }) => formatMoney(amount, currency))
          .join(" + ");

  return (
    <>
      <TopBar title="Campaign Report">
        <Link href="/campaigns" className="btn-secondary" style={{ textDecoration: "none" }}>
          <ArrowLeft size={13} />
          Campaigns
        </Link>
      </TopBar>

      <div className="page-content">
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <select
                className="filter-select"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                aria-label="Filter by campaign"
              >
                <option value="all">All campaigns</option>
                {totals.map((t) => (
                  <option key={t.campaignId} value={t.campaignId}>
                    {t.campaignName}
                  </option>
                ))}
              </select>
              {!summary.singleCurrency && summary.spendByCurrency.length > 1 && (
                <span style={{ fontSize: 11, color: "var(--accent-amber)" }}>
                  Mixed currencies — pick one campaign to see cost per lead.
                </span>
              )}
            </div>

            {/* Volume */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <KpiCard label="Ad Spend" value={spendLabel} />
              <KpiCard label="Leads" value={summary.totalLeads} />
              <KpiCard
                label="Qualified"
                value={summary.qualifiedLeads}
                sub={`${formatRate(summary.qualifiedRate)} of leads`}
                color="var(--accent-lime)"
              />
              <KpiCard
                label="Booked"
                value={summary.bookedCount}
                color="var(--accent-emerald)"
              />
              <KpiCard
                label="Won"
                value={summary.wonCount}
                accent
                color="var(--accent-lime)"
              />
            </div>

            {/* Efficiency */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <KpiCard label="Cost / Lead" value={cost(summary.costPerLead)} />
              <KpiCard
                label="Cost / Qualified Lead"
                value={cost(summary.costPerQualifiedLead)}
                color="var(--accent-cyan)"
              />
              <KpiCard
                label="Cost / Booking"
                value={cost(summary.costPerBooking)}
                color="var(--accent-emerald)"
              />
              <KpiCard
                label="Cost / Win"
                value={cost(summary.costPerWin)}
                accent
                color="var(--accent-lime)"
              />
            </div>

            {/* The loop closed: what came back out. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <KpiCard
                label="Revenue Collected"
                value={money(summary.revenueCollected)}
                color="var(--accent-lime)"
              />
              <KpiCard
                label="Outstanding"
                value={money(summary.revenueOutstanding)}
                sub="billed, not yet paid"
                color={
                  summary.revenueOutstanding > 0
                    ? "var(--accent-amber)"
                    : "var(--text-muted)"
                }
              />
              <KpiCard
                label="Return on Ad Spend"
                value={summary.singleCurrency ? formatRoas(summary.roas) : "—"}
                sub="collected ÷ spend"
                accent
                color={
                  summary.singleCurrency ? roasColor(summary.roas) : "var(--text-muted)"
                }
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={sectionLabel}>By Campaign — All Time</div>
              <CampaignTotalsTable totals={shownTotals} />
            </div>

            <div>
              <div style={sectionLabel}>By Spend Period</div>
              <p style={{ color: "var(--text-faint)", fontSize: 11, marginBottom: 12 }}>
                A lead counts towards the period it came in on, and its revenue
                counts with it whenever the cash actually arrived — so a period's
                ROAS is what that week's leads have paid back against what that
                week cost. Leads that landed outside every logged period show up
                in the all-time table above but not here.
              </p>
              <PeriodReportTable periods={shownPeriods} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
