import { TIER_META } from "@/lib/constants/tiers";
import { LeadTier } from "@/types/lead";

interface TierRow {
  tier: LeadTier;
  total: number;
  contacted: number;
  booked: number;
  rate: number;
}

interface TierPerformanceTableProps {
  data: TierRow[];
}

export default function TierPerformanceTable({ data }: TierPerformanceTableProps) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Tier</th>
          <th style={{ textAlign: "right" }}>Total</th>
          <th style={{ textAlign: "right" }}>Contacted</th>
          <th style={{ textAlign: "right" }}>Booked</th>
          <th style={{ textAlign: "right" }}>Booking %</th>
        </tr>
      </thead>
      <tbody>
        {data.map(({ tier, total, contacted, booked, rate }) => {
          const meta = TIER_META[tier];
          return (
            <tr key={tier}>
              <td>
                <span style={{ color: meta.color, fontWeight: 700, fontSize: 11 }}>
                  {tier}
                </span>
              </td>
              <td
                style={{ textAlign: "right", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
              >
                {total}
              </td>
              <td
                style={{ textAlign: "right", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
              >
                {contacted}
              </td>
              <td
                style={{ textAlign: "right", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}
              >
                {booked}
              </td>
              <td
                style={{
                  textAlign: "right",
                  color: rate > 0 ? "var(--accent-lime)" : "var(--text-faint)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                }}
              >
                {rate > 0 ? `${(rate * 100).toFixed(0)}%` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
