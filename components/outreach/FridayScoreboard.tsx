import { MONTHLY_SIGNED_CLIENTS_TARGET, WEEKLY_BOOKED_CALLS_TARGET } from "@/lib/outreach/constants";
import { targetColor } from "@/lib/outreach/pacing";
import { formatDayMonth } from "@/lib/outreach/date";
import type { WeekTrend } from "@/lib/outreach/queries";

interface FridayScoreboardProps {
  bookedCallsThisWeek: number;
  signedClientsThisMonth: number;
  trend: WeekTrend[]; // oldest first
}

export default function FridayScoreboard({ bookedCallsThisWeek, signedClientsThisMonth, trend }: FridayScoreboardProps) {
  const bookedColor = targetColor(bookedCallsThisWeek, WEEKLY_BOOKED_CALLS_TARGET);
  const signedColor = targetColor(signedClientsThisMonth, MONTHLY_SIGNED_CLIENTS_TARGET);

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
        Friday Scoreboard
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-label">Booked Calls This Week</div>
          <div className="kpi-value" style={{ color: bookedColor }}>
            {bookedCallsThisWeek}
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {" "}
              / {WEEKLY_BOOKED_CALLS_TARGET.min}–{WEEKLY_BOOKED_CALLS_TARGET.max}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Signed Clients This Month</div>
          <div className="kpi-value" style={{ color: signedColor }}>
            {signedClientsThisMonth}
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {" "}
              / {MONTHLY_SIGNED_CLIENTS_TARGET.min}–{MONTHLY_SIGNED_CLIENTS_TARGET.max}
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
        4-Week Momentum — Booked Calls
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Week Of</th>
            <th>Booked Calls</th>
            <th>vs Target</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((week) => {
            const color = targetColor(week.bookedCalls, WEEKLY_BOOKED_CALLS_TARGET);
            return (
              <tr key={week.weekStart}>
                <td>{formatDayMonth(week.weekStart)}</td>
                <td style={{ fontFamily: "var(--font-mono)", color }}>{week.bookedCalls}</td>
                <td style={{ color }}>
                  {week.bookedCalls < WEEKLY_BOOKED_CALLS_TARGET.min
                    ? "Below"
                    : week.bookedCalls <= WEEKLY_BOOKED_CALLS_TARGET.max
                      ? "Met"
                      : "Exceeded"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
