interface KpiCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  sub?: string;
  color?: string;
}

export default function KpiCard({ label, value, accent, sub, color }: KpiCardProps) {
  return (
    <div
      className="kpi-card"
      style={
        accent
          ? { borderColor: color ?? "var(--accent-lime)", borderWidth: 1 }
          : {}
      }
    >
      <div className="kpi-label">{label}</div>
      <div
        className="kpi-value"
        style={{ color: color ?? (accent ? "var(--accent-lime)" : "var(--text-primary)") }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "var(--text-faint)",
            letterSpacing: "0.04em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
