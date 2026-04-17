import { CallStatus } from "@/types/lead";
import { STATUS_META } from "@/lib/constants/statuses";

interface StatusBreakdownChartProps {
  data: { status: CallStatus; count: number }[];
}

export default function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const nonEmpty = data.filter((d) => d.count > 0);

  if (nonEmpty.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: 12, padding: "20px 0" }}>
        No data yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {nonEmpty.map(({ status, count }) => {
        const meta = STATUS_META[status];
        const pct = (count / max) * 100;
        return (
          <div key={status} className="bar-chart-row">
            <div
              style={{
                width: 120,
                fontSize: 10,
                color: meta.color,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {meta.label}
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${pct}%`,
                  color: meta.color,
                }}
              />
            </div>
            <div
              style={{
                width: 32,
                textAlign: "right",
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
