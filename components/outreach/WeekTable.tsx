import { CHANNELS, WEEKLY_BOOKED_CALLS_TARGET } from "@/lib/outreach/constants";
import { weeklyBookedCallsPacing } from "@/lib/outreach/pacing";
import { formatDayMonth, formatWeekdayShort, weekdayIndex } from "@/lib/outreach/date";
import type { DailyOutreachLog } from "@/lib/outreach/queries";

interface WeekTableProps {
  weekDates: string[]; // Mon..Fri
  logs: DailyOutreachLog[];
  today: string;
}

export default function WeekTable({ weekDates, logs, today }: WeekTableProps) {
  const byDate = new Map(logs.map((log) => [log.log_date, log]));

  const weekSum = (key: (typeof CHANNELS)[number]["key"]) =>
    weekDates.reduce((sum, date) => sum + (byDate.get(date)?.[key] ?? 0), 0);

  const bookedCallsSum = weekSum("booked_calls");
  const pacing = weeklyBookedCallsPacing(bookedCallsSum, weekdayIndex(today));
  const progressPct = Math.min(100, (bookedCallsSum / WEEKLY_BOOKED_CALLS_TARGET.max) * 100);

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", padding: 16 }}>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Channel</th>
              {weekDates.map((date) => (
                <th key={date} style={date === today ? { color: "var(--accent-cyan)" } : undefined}>
                  {formatWeekdayShort(date)} {formatDayMonth(date)}
                </th>
              ))}
              <th>Week Total</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map(({ key, label }) => (
              <tr key={key}>
                <td style={{ color: "var(--text-secondary)" }}>{label}</td>
                {weekDates.map((date) => (
                  <td key={date} style={{ fontFamily: "var(--font-mono)" }}>
                    {byDate.get(date)?.[key] ?? 0}
                  </td>
                ))}
                <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{weekSum(key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Booked Calls This Week
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: pacing.color }}>
              {bookedCallsSum} / {WEEKLY_BOOKED_CALLS_TARGET.min}–{WEEKLY_BOOKED_CALLS_TARGET.max}
            </span>
            <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: pacing.color, fontWeight: 700 }}>
              {pacing.label}
            </span>
          </div>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${progressPct}%`, color: pacing.color }} />
        </div>
      </div>
    </div>
  );
}
