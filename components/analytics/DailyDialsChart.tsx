interface DayBucket {
  date: string;
  count: number;
}

interface DailyDialsChartProps {
  data: DayBucket[];
}

function shortDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

const CHART_HEIGHT = 120;

export default function DailyDialsChart({ data }: DailyDialsChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <div className="daily-bar-chart">
        {data.map(({ date, count }) => {
          const heightPx = Math.round((count / max) * CHART_HEIGHT);
          return (
            <div key={date} className="daily-bar-col" title={`${shortDate(date)}: ${count} dials`}>
              <div
                className="daily-bar"
                style={{ height: `${Math.max(heightPx, count > 0 ? 2 : 0)}px` }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: 0,
          marginTop: 4,
        }}
      >
        {data.map(({ date, count }) => (
          <div
            key={date}
            className="daily-bar-col"
            style={{ flex: 1, textAlign: "center" }}
          >
            <div className="daily-bar-label">{shortDate(date)}</div>
            {count > 0 && (
              <div
                style={{
                  fontSize: 9,
                  color: "var(--accent-lime)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {count}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
