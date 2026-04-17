"use client";

import { useLeads } from "@/hooks/useLeads";
import { useAnalytics } from "@/hooks/useAnalytics";
import TopBar from "@/components/layout/TopBar";
import KpiCard from "@/components/analytics/KpiCard";
import StatusBreakdownChart from "@/components/analytics/StatusBreakdownChart";
import TierPerformanceTable from "@/components/analytics/TierPerformanceTable";
import DailyDialsChart from "@/components/analytics/DailyDialsChart";
import { BarChart2 } from "lucide-react";

export default function AnalyticsPage() {
  const { leads, loading, error } = useLeads();
  const stats = useAnalytics(leads);

  if (loading) {
    return (
      <>
        <TopBar title="Analytics" />
        <div className="page-content" style={{ color: "var(--text-muted)" }}>
          Loading...
        </div>
      </>
    );
  }

  if (leads.length === 0) {
    return (
      <>
        <TopBar title="Analytics" />
      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}
        <div className="empty-state">
            <BarChart2 size={40} color="var(--text-faint)" />
            <div className="empty-state-title">No data yet</div>
            <div className="empty-state-subtitle">
              Import leads and start dialing to see your analytics.
            </div>
          </div>
        </div>
      </>
    );
  }

  const sectionLabel = {
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    fontWeight: 600,
    marginBottom: 12,
  };

  const sectionBox = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border-subtle)",
    padding: "16px 20px",
  };

  return (
    <>
      <TopBar title="Analytics" />
      <div className="page-content">
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
        {/* KPI Row 1 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <KpiCard label="Total Leads" value={stats.totalLeads} />
          <KpiCard label="Dials Logged" value={stats.dialsLogged} />
          <KpiCard label="Unique Contacted" value={stats.uniqueContacted} />
          <KpiCard
            label="Discovery Booked"
            value={stats.discoveryBooked}
            color="var(--accent-cyan)"
          />
          <KpiCard
            label="Closed Won"
            value={stats.closedWon}
            accent
            color="var(--accent-lime)"
          />
        </div>

        {/* KPI Row 2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Contact Rate"
            value={`${(stats.contactRate * 100).toFixed(0)}%`}
            sub="of dials = real contact"
          />
          <KpiCard
            label="Booking Rate"
            value={`${(stats.bookingRate * 100).toFixed(0)}%`}
            sub="of contacts → discovery"
            color="var(--accent-cyan)"
          />
          <KpiCard
            label="Nurture / Callback"
            value={stats.inNurtureOrCallback}
            color="var(--accent-emerald)"
          />
          <KpiCard
            label="Dead (DNC + Wrong#)"
            value={stats.dead}
            color="var(--accent-red)"
          />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Status Breakdown */}
          <div style={sectionBox}>
            <div style={sectionLabel}>Status Breakdown</div>
            <StatusBreakdownChart data={stats.statusBreakdown} />
          </div>

          {/* Tier Performance */}
          <div style={sectionBox}>
            <div style={sectionLabel}>Performance by Tier</div>
            <TierPerformanceTable data={stats.tierPerf} />
          </div>
        </div>

        {/* Daily Dials */}
        <div style={{ ...sectionBox, marginTop: 16 }}>
          <div style={sectionLabel}>Dials Per Day — Last 14 Days</div>
          <DailyDialsChart data={stats.dailyDials} />
        </div>
      </div>
    </>
  );
}
